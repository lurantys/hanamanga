import { fetchFeed, type Chapter } from "./mangadex";

const BASE = "https://mangakatana.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Hana/1.0";

const CACHE_TTL = 60_000;
const cacheStore = new Map<string, { expires: number; promise: Promise<unknown> }>();

export class MangaKatanaError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "MangaKatanaError";
    this.status = status;
  }
}

export type KatanaManga = {
  id: number;
  slug: string;
  url: string;
  title: string;
};

export type KatanaChapter = {
  id: string;
  number: number | null;
  title: string | null;
  label: string;
  publishedAt: string | null;
};

export type KatanaReader = {
  chapterLabel: string;
  chapterNumber: number | null;
  chapters: { id: string; label: string }[];
  pages: { id: string; image: string }[];
  prevHref: string | null;
  nextHref: string | null;
};

async function katanaGet(url: string): Promise<string> {
  const cached = cacheStore.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.promise as Promise<string>;
  }
  const promise = (async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new MangaKatanaError(
        `MangaKatana request failed: ${res.status} ${res.statusText}`,
        res.status,
      );
    }
    return res.text();
  })();
  cacheStore.set(url, { expires: Date.now() + CACHE_TTL, promise });
  try {
    return (await promise) as string;
  } catch (error) {
    cacheStore.delete(url);
    throw error;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function parseMangaUrl(href: string): { slug: string; id: number } | null {
  const match = href.match(/mangakatana\.com\/manga\/(.+)\.(\d+)$/);
  if (!match) return null;
  return { slug: match[1], id: Number(match[2]) };
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^the\s+/, "")
    .trim();
}

function titleHits(query: string, candidate: KatanaManga): boolean {
  const q = normalizeTitle(query);
  if (!q) return false;
  const target = normalizeTitle(candidate.title);
  if (!target) return false;
  if (target === q) return true;
  const qTokens = new Set(q.split(" ").filter((token) => token.length > 2));
  if (!qTokens.size) return false;
  const tTokens = new Set(target.split(" ").filter((token) => token.length > 2));
  if ([...qTokens].every((token) => tTokens.has(token))) return true;
  if ([...tTokens].every((token) => qTokens.has(token))) return true;
  return false;
}

export async function searchKatanaManga(title: string): Promise<KatanaManga[]> {
  const html = await katanaGet(
    `${BASE}/?search=${encodeURIComponent(title.trim())}`,
  );
  const countMatch = html.match(/Search results \((\d+)\)/);
  const limit = countMatch ? Number(countMatch[1]) : null;
  if (limit === 0) return [];

  const results: KatanaManga[] = [];
  for (const block of html.matchAll(/<h3 class="title">([\s\S]*?)<\/h3>/g)) {
    const anchor = block[1].match(
      /<a href="(https:\/\/mangakatana\.com\/manga\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/,
    );
    if (!anchor) continue;
    const parsed = parseMangaUrl(anchor[1]);
    if (!parsed) continue;
    results.push({
      ...parsed,
      url: anchor[1],
      title: decodeEntities(anchor[2]).trim(),
    });
    if (limit !== null && results.length >= limit) break;
  }
  return results;
}

export async function findKatanaManga(
  title: string,
): Promise<KatanaManga | null> {
  const results = await searchKatanaManga(title);
  return results.find((candidate) => titleHits(title, candidate)) ?? null;
}

function katanaChapterTitle(label: string, number: number | null): string | null {
  let rest = label;
  if (number !== null) {
    const digits = String(number).replace(".", "\\.");
    rest = rest.replace(new RegExp(`^Chapter\\s+${digits}\\s*:?\\s*`, "i"), "");
  }
  rest = rest.trim();
  return rest ? rest : null;
}

export async function fetchKatanaChapters(
  manga: KatanaManga,
): Promise<KatanaChapter[]> {
  const html = await katanaGet(manga.url);
  const start = html.indexOf('<div class="chapters">');
  if (start === -1) return [];
  const end = html.indexOf("</table>", start);
  if (end === -1) return [];
  const table = html.slice(start, end);

  const chapters: KatanaChapter[] = [];
  const rowRe =
    /<tr[^>]*>[\s\S]*?<a href="[^"]*\/c([0-9.]+)">([\s\S]*?)<\/a>[\s\S]*?<div class="update_time">([\s\S]*?)<\/div>/g;
  for (const row of table.matchAll(rowRe)) {
    const label = decodeEntities(row[2]).replace(/\s+/g, " ").trim();
    const number = Number.parseFloat(row[1]);
    chapters.push({
      id: `c${row[1]}`,
      number: Number.isFinite(number) ? number : null,
      title: katanaChapterTitle(label, number),
      label,
      publishedAt: row[3].trim() || null,
    });
  }

  return chapters.sort(
    (a, b) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) -
      (b.number ?? Number.MAX_SAFE_INTEGER),
  );
}

function extractImageUrls(html: string): string[] {
  let best: string[] = [];
  for (const block of html.matchAll(/var\s+\w+\s*=\s*\[([\s\S]*?)\];/g)) {
    const urls = [
      ...block[1].matchAll(/https:\/\/i\d+\.mangakatana\.com\/token\/[^'"]+/g),
    ].map((match) => match[0]);
    if (urls.length > best.length) best = urls;
  }
  return best;
}

function decodeAtcq(raw: string): string[] {
  const first = Buffer.from(raw.trim(), "base64").toString("latin1");
  const reversed = first.split("").reverse().join("");
  const second = Buffer.from(reversed, "base64").toString("utf8");
  return (JSON.parse(second) as string[]).slice(2);
}

export async function fetchKatanaPages(
  manga: KatanaManga,
  chapter: KatanaChapter,
): Promise<string[]> {
  const chapterUrl = `${manga.url}/${chapter.id}`;
  const html = await katanaGet(chapterUrl);
  const embedded = extractImageUrls(html);
  if (embedded.length) return embedded;

  const res = await fetch(chapterUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Referer: chapterUrl,
    },
    body: "atcq=",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new MangaKatanaError(
      `MangaKatana chapter request failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
  return decodeAtcq(await res.text());
}

export function matchKatanaChapter(
  chapters: KatanaChapter[],
  number: string | null | undefined,
  title: string | null | undefined,
): KatanaChapter | null {
  if (number !== null && number !== undefined) {
    const target = Number(number);
    if (Number.isFinite(target)) {
      const exact = chapters.find(
        (chapter) =>
          chapter.number !== null && Math.abs(chapter.number - target) < 1e-9,
      );
      if (exact) return exact;
    }
  }
  if (title) {
    const norm = normalizeTitle(title);
    if (norm) {
      const byTitle = chapters.find(
        (chapter) => chapter.title && normalizeTitle(chapter.title) === norm,
      );
      if (byTitle) return byTitle;
    }
  }
  return null;
}

async function resolveLegacyChapter(
  chapters: KatanaChapter[],
  mangaId: string,
  chapterId: string,
): Promise<KatanaChapter | null> {
  try {
    const feed = await fetchFeed(mangaId);
    const chapter = feed.data.find((item) => item.id === chapterId);
    if (!chapter) return null;
    return matchKatanaChapter(chapters, chapter.chapter, chapter.title);
  } catch {
    return null;
  }
}

export async function fetchKatanaReader(opts: {
  mangaTitle: string;
  chapterId: string;
  mangaId?: string;
}): Promise<KatanaReader | null> {
  const manga = await findKatanaManga(opts.mangaTitle);
  if (!manga) return null;
  const chapters = await fetchKatanaChapters(manga);
  if (!chapters.length) return null;

  let current =
    chapters.find((chapter) => chapter.id === opts.chapterId) ?? null;
  if (!current && opts.mangaId) {
    current = await resolveLegacyChapter(chapters, opts.mangaId, opts.chapterId);
  }
  if (!current) return null;

  const pages = await fetchKatanaPages(manga, current);
  if (!pages.length) return null;

  const index = chapters.indexOf(current);
  const prev = index > 0 ? chapters[index - 1] : null;
  const next = index < chapters.length - 1 ? chapters[index + 1] : null;

  return {
    chapterLabel: current.label,
    chapterNumber: current.number,
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      label: chapter.label,
    })),
    pages: pages.map((image) => ({ id: image, image })),
    prevHref: prev ? `/read/${opts.mangaId}/${prev.id}` : null,
    nextHref: next ? `/read/${opts.mangaId}/${next.id}` : null,
  };
}

export async function fetchKatanaFirstChapter(
  mangaTitle: string,
): Promise<string | null> {
  const manga = await findKatanaManga(mangaTitle);
  if (!manga) return null;
  const chapters = await fetchKatanaChapters(manga);
  return chapters[0]?.id ?? null;
}

export function toCatalogChapter(chapter: KatanaChapter): Chapter {
  return {
    id: chapter.id,
    title: chapter.label,
    volume: null,
    chapter: null,
    pages: 0,
    translatedLanguage: "en",
    externalUrl: null,
    publishedAt: chapter.publishedAt ?? undefined,
  };
}

export async function fetchKatanaCatalogChapters(
  mangaTitle: string,
): Promise<Chapter[]> {
  const manga = await findKatanaManga(mangaTitle);
  if (!manga) return [];
  const chapters = await fetchKatanaChapters(manga);
  return chapters.map(toCatalogChapter);
}
