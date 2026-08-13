import { fetchFeed, type Chapter } from "./mangadex";
import { normalizeTitleKey, titleHits } from "./title";

const BASE = "https://weebcentral.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Hana/1.0";

const CACHE_TTL = 60_000;
const cacheStore = new Map<string, { expires: number; promise: Promise<unknown> }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WeebCentralError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "WeebCentralError";
    this.status = status;
  }
}

export type WeebManga = {
  id: string;
  slug: string;
  url: string;
  title: string;
};

export type WeebChapter = {
  id: string;
  url: string;
  number: number | null;
  title: string | null;
  label: string;
  publishedAt: string | null;
};

async function weebGet(url: string): Promise<string> {
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
      throw new WeebCentralError(
        `WeebCentral request failed: ${res.status} ${res.statusText}`,
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

function parseSeriesUrl(href: string): { id: string; slug: string } | null {
  const match = href.match(/weebcentral\.com\/series\/([A-Za-z0-9]+)\/([^/]+)/);
  if (!match) return null;
  return { id: match[1], slug: match[2] };
}

export async function searchWeebManga(title: string): Promise<WeebManga[]> {
  const url = `${BASE}/search/data?text=${encodeURIComponent(title.trim())}&limit=20&offset=0&display_mode=Full%20Display`;
  let html = await weebGet(url);
  if (!html.includes("line-clamp-1 link link-hover")) {
    await sleep(700);
    html = await weebGet(url);
  }
  const results: WeebManga[] = [];
  for (const block of html.matchAll(
    /<a href="(https:\/\/weebcentral\.com\/series\/[^"]+)" class="line-clamp-1 link link-hover">([\s\S]*?)<\/a>/g,
  )) {
    const parsed = parseSeriesUrl(block[1]);
    if (!parsed) continue;
    results.push({
      ...parsed,
      url: block[1],
      title: decodeEntities(block[2]).trim(),
    });
  }
  return results;
}

export async function findWeebManga(title: string): Promise<WeebManga | null> {
  const results = await searchWeebManga(title);
  if (!results.length) return null;
  const key = normalizeTitleKey(title);
  const exact = results.find(
    (candidate) => normalizeTitleKey(candidate.title) === key,
  );
  return (
    exact ??
    results.find((candidate) => titleHits(title, [candidate.title])) ??
    null
  );
}

function weebChapterNumber(label: string): number | null {
  const match = label.match(
    /(?:chapter|ch\.|ep|episode)\s*([0-9]+(?:\.[0-9]+)?)/i,
  );
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function weebChapterTitle(label: string, number: number | null): string | null {
  let rest = label;
  if (number !== null) {
    const digits = String(number).replace(".", "\\.");
    rest = rest.replace(
      new RegExp(`^(?:chapter|ch\\.)\\s*${digits}\\s*:?\\s*`, "i"),
      "",
    );
  }
  rest = rest.trim();
  return rest ? rest : null;
}

export async function fetchWeebChapters(
  manga: WeebManga,
): Promise<WeebChapter[]> {
  const url = `${manga.url}/full-chapter-list`;
  let html = await weebGet(url);
  if (!html.includes("hover:bg-base-300 flex-1 flex items-center p-2")) {
    await sleep(700);
    html = await weebGet(url);
  }
  const chapters: WeebChapter[] = [];
  const rowRe =
    /<a href="(\/chapters\/[A-Za-z0-9]+)" class="hover:bg-base-300 flex-1 flex items-center p-2">([\s\S]*?)<\/a>/g;
  for (const row of html.matchAll(rowRe)) {
    const labelSpan = row[2].match(/<span class="">([\s\S]*?)<\/span>/);
    if (!labelSpan) continue;
    const label = decodeEntities(labelSpan[1]).replace(/\s+/g, " ").trim();
    if (!label) continue;
    const number = weebChapterNumber(label);
    const time = row[2].match(/datetime="([^"]+)"/);
    chapters.push({
      id: row[1].replace("/chapters/", ""),
      url: `${BASE}${row[1]}`,
      number,
      title: weebChapterTitle(label, number),
      label,
      publishedAt: time ? time[1] : null,
    });
  }
  return chapters.sort(
    (a, b) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) -
      (b.number ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function fetchWeebPages(chapterUrl: string): Promise<string[]> {
  const html = await weebGet(
    `${chapterUrl}/images?is_prev=False&reading_style=long_strip`,
  );
  return [...html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)].map(
    (match) => match[1],
  );
}

export function matchWeebChapter(
  chapters: WeebChapter[],
  number: string | null | undefined,
  title: string | null | undefined,
): WeebChapter | null {
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
    const norm = normalizeTitleKey(title);
    if (norm) {
      const byTitle = chapters.find(
        (chapter) =>
          chapter.title && normalizeTitleKey(chapter.title) === norm,
      );
      if (byTitle) return byTitle;
    }
  }
  return null;
}

export async function resolveWeebLegacyChapter(
  chapters: WeebChapter[],
  mangaId: string,
  chapterId: string,
): Promise<WeebChapter | null> {
  try {
    const feed = await fetchFeed(mangaId);
    const chapter = feed.data.find((item) => item.id === chapterId);
    if (!chapter) return null;
    return matchWeebChapter(chapters, chapter.chapter, chapter.title);
  } catch {
    return null;
  }
}

export async function fetchWeebFirstChapter(
  mangaTitle: string,
): Promise<string | null> {
  const { chapters } = await getWeebLookupData(mangaTitle);
  return chapters[0]?.id ?? null;
}

const LOOKUP_PACE_MS = 1500;

export async function getWeebLookupData(title: string): Promise<{
  manga: WeebManga | null;
  chapters: WeebChapter[];
}> {
  const manga = await findWeebManga(title);
  if (!manga) return { manga: null, chapters: [] };
  await sleep(LOOKUP_PACE_MS);
  const chapters = await fetchWeebChapters(manga);
  return { manga, chapters };
}

export function toWeebCatalogChapter(chapter: WeebChapter): Chapter {
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

export async function fetchWeebCatalogChapters(
  mangaTitle: string,
): Promise<Chapter[]> {
  const manga = await findWeebManga(mangaTitle);
  if (!manga) return [];
  const chapters = await fetchWeebChapters(manga);
  return chapters.map(toWeebCatalogChapter);
}
