import { titleHits } from "./title";

const ATSU_API = "https://atsu.moe";
export const ATSU_CDN = "https://cdn.atsu.moe";

export type AtsuCandidate = {
  id: string;
  title: string | null;
  englishTitle: string | null;
  chapterCount: number | null;
  type?: string;
  medium?: string;
  status?: string;
  year?: number | null;
  poster?: string | null;
  otherNames?: string[];
  genres?: string[];
  rating?: number;
};

export type AtsuChapter = {
  id: string;
  scanlationMangaId: string;
  title: string | null;
  number: number | null;
  createdAt: number;
  index: number;
  pageCount: number;
};

export type AtsuScanlator = { id: string; name: string };

export type AtsuManga = {
  id: string;
  title: string;
  englishTitle: string | null;
  anilistId?: number | null;
  malId?: number | null;
  kitsuId?: number | null;
  apId?: string | null;
  mangaUpdatesId?: string | null;
  status?: string | null;
  medium?: string;
  type?: string;
  poster?: string | null;
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  totalChapterCount?: number | null;
  genres: string[];
  tags: string[];
  rating?: number;
  isAdult?: boolean;
};

export type AtsuPage = {
  id: string;
  image: string;
  number: number;
  width: number;
  height: number;
};

export type AtsuChapterRead = {
  id: string;
  title: string | null;
  scanlationMangaId: string;
  pages: AtsuPage[];
};

export type AtsuMatch = {
  manga: AtsuManga;
  matchedByLink: boolean;
};

type LinkMap = Record<string, string> | undefined;

const ATSU_CACHE_TTL = 60_000;
const atsuCacheStore = new Map<string, { expires: number; promise: Promise<unknown> }>();

async function atsuFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    usp.set(key, String(value));
  }
  const url = `${ATSU_API}${path}?${usp.toString()}`;
  const cached = atsuCacheStore.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.promise as Promise<T>;
  }
  const promise = (async () => {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Hana/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      throw new Error(`Atsumaru request failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  })();
  atsuCacheStore.set(url, { expires: Date.now() + ATSU_CACHE_TTL, promise });
  try {
    return (await promise) as T;
  } catch (error) {
    atsuCacheStore.delete(url);
    throw error;
  }
}

function atsuCandidateFromDocument(
  doc: Record<string, unknown>,
): AtsuCandidate {
  return {
    id: String(doc.id),
    title: (doc.title as string) ?? null,
    englishTitle: (doc.englishTitle as string) ?? null,
    chapterCount: (doc.chapterCount as number) ?? null,
    type: (doc.type as string) ?? undefined,
    medium: (doc.medium as string) ?? undefined,
    status: (doc.status as string) ?? undefined,
    year: (doc.year as number) ?? null,
    poster: (doc.poster as string) ?? null,
    otherNames: Array.isArray(doc.otherNames)
      ? (doc.otherNames as string[])
      : undefined,
    genres: Array.isArray(doc.tags)
      ? (doc.tags as string[]).filter(
          (tag): tag is string => typeof tag === "string" && tag.trim() !== "",
        )
      : undefined,
    rating: typeof doc.mbRating === "number" ? (doc.mbRating as number) : undefined,
  };
}

export async function searchAtsu(
  title: string,
  limit = 8,
): Promise<AtsuCandidate[]> {
  const json = await atsuFetch<{ hits?: { document: Record<string, unknown> }[] }>(
    "/collections/manga/documents/search",
    {
      q: title,
      query_by: "title,englishTitle,otherNames,authors,acronyms",
      prefix: "true",
      num_typos: 1,
      per_page: limit,
      page: 1,
      filter_by: "hidden:!=true",
    },
  );

  return (json.hits ?? []).map((hit) =>
    atsuCandidateFromDocument(hit.document),
  );
}

/**
 * Look up an Atsumaru record by its AniList ID directly. Used to resolve
 * `al:<id>` URLs when AniList itself is unreachable, so guests keep access
 * to metadata and chapters from other providers.
 */
export async function findAtsuCandidateByAniListId(
  anilistId: string,
): Promise<AtsuCandidate | null> {
  const json = await atsuFetch<{ hits?: { document: Record<string, unknown> }[] }>(
    "/collections/manga/documents/search",
    {
      q: "*",
      query_by: "title",
      filter_by: `hidden:!=true && anilistId:=${anilistId}`,
      per_page: 1,
      page: 1,
    },
  );
  const doc = json.hits?.[0]?.document;
  return doc ? atsuCandidateFromDocument(doc) : null;
}

export async function listAtsuManga(opts: {
  type?: string;
  limit?: number;
  sort?: string;
} = {}): Promise<AtsuCandidate[]> {
  const filters = ["hidden:!=true", ...(opts.type ? [`type:${opts.type}`] : [])];
  const json = await atsuFetch<{ hits?: { document: Record<string, unknown> }[] }>(
    "/collections/manga/documents/search",
    {
      q: "*",
      query_by: "title",
      per_page: opts.limit ?? 18,
      page: 1,
      filter_by: filters.join(" && "),
      sort_by: opts.sort ?? "chapterCount:desc",
    },
  );
  return (json.hits ?? []).map((hit) =>
    atsuCandidateFromDocument(hit.document),
  );
}

type MangaPageJson = {
  mangaPage: {
    id: string;
    title: string;
    englishTitle?: string | null;
    anilistId?: number | null;
    malId?: number | null;
    kitsuId?: number | null;
    apId?: string | null;
    mangaUpdatesId?: string | null;
    status?: string | null;
    medium?: string;
    type?: string;
    poster?: { image?: string; largeImage?: string } | null;
    scanlators?: { id: string; name: string }[];
    chapters?: {
      id: string;
      scanlationMangaId: string;
      title: string | null;
      number: number | null;
      createdAt: number;
      index: number;
      pageCount: number;
    }[];
    totalChapterCount?: number | null;
    genres?: { id: string; name: string; weight?: string }[];
    tags?: { id: string; name: string; namePath?: string; weight?: string }[];
    avgRating?: number | null;
    isAdult?: boolean;
  } | null;
};

function normalizeAtsuManga(m: MangaPageJson["mangaPage"]): AtsuManga {
  if (!m) throw new Error("Manga not found on Atsumaru");
  return {
    id: m.id,
    title: m.title ?? "",
    englishTitle: m.englishTitle ?? null,
    anilistId: m.anilistId ?? null,
    malId: m.malId ?? null,
    kitsuId: m.kitsuId ?? null,
    apId: m.apId ?? null,
    mangaUpdatesId: m.mangaUpdatesId ?? null,
    status: m.status ?? null,
    medium: m.medium,
    type: m.type,
    poster: m.poster?.largeImage ?? m.poster?.image ?? null,
    scanlators: m.scanlators ?? [],
    chapters: m.chapters ?? [],
    totalChapterCount: m.totalChapterCount ?? null,
    genres: (m.genres ?? [])
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name?.trim())),
    tags: (m.tags ?? [])
      .map((tag) => tag.name)
      .filter((name): name is string => Boolean(name?.trim())),
    rating: typeof m.avgRating === "number" ? m.avgRating : undefined,
    isAdult: m.isAdult ?? false,
  };
}

export function atsuPosterUrl(poster: string | null): string | null {
  if (!poster) return null;
  if (poster.startsWith("http")) return poster;
  return `${ATSU_CDN}${poster.startsWith("/") ? poster : `/static/${poster}`}`;
}

export async function fetchAtsuManga(id: string): Promise<AtsuManga> {
  const json = await atsuFetch<MangaPageJson>("/api/manga/page", { id });
  return normalizeAtsuManga(json.mangaPage);
}

export async function fetchAtsuChapters(mangaId: string): Promise<AtsuChapter[]> {
  const json = await atsuFetch<{ chapters?: AtsuChapter[] }>(
    "/api/manga/allChapters",
    { mangaId },
  );
  return (json.chapters ?? []).map((chapter) => ({
    id: chapter.id,
    scanlationMangaId: chapter.scanlationMangaId,
    title: chapter.title ?? null,
    number: chapter.number ?? null,
    createdAt: chapter.createdAt,
    index: chapter.index,
    pageCount: chapter.pageCount,
  }));
}

export async function fetchAtsuChapter(
  mangaId: string,
  chapterId: string,
): Promise<AtsuChapterRead> {
  const json = await atsuFetch<{
    readChapter: {
      id: string;
      title: string | null;
      scanlationMangaId: string;
      pages?: { id: string; image: string; number: number; width: number; height: number }[];
    } | null;
  }>("/api/read/chapter", { mangaId, chapterId });

  const readChapter = json.readChapter;
  if (!readChapter) throw new Error("Chapter not found on Atsumaru");

  return {
    id: readChapter.id,
    title: readChapter.title ?? null,
    scanlationMangaId: readChapter.scanlationMangaId ?? "",
    pages: (readChapter.pages ?? []).map((page) => ({
      id: page.id,
      image: page.image,
      number: page.number,
      width: page.width,
      height: page.height,
    })),
  };
}

export function atsuPageUrl(page: { image: string }): string {
  return `${ATSU_CDN}${page.image}`;
}

export function atsuChapterLabel(chapter: Pick<AtsuChapter, "title" | "number">): string {
  if (chapter.title?.trim()) return chapter.title.trim();
  if (chapter.number !== null && chapter.number !== undefined) {
    return `Chapter ${chapter.number}`;
  }
  return "Chapter";
}

function expectedLinks(links: LinkMap): Record<string, string> {
  const expected: Record<string, string> = {};
  if (links?.al) expected.anilistId = links.al;
  if (links?.mal) expected.malId = links.mal;
  if (links?.kt) expected.kitsuId = links.kt;
  if (links?.ap) expected.apId = links.ap;
  if (links?.mu) expected.mangaUpdatesId = links.mu;
  return expected;
}

/**
 * Find the Atsumaru (atsu.moe) record for a MangaDex title.
 *
 * atsu.moe links its catalog to the same external sources MangaDex exposes in
 * `links` (AniList, MyAnimeList, Kitsu, Anime-Planet, MangaUpdates), so we
 * search by title, then confirm candidates by comparing those external IDs.
 * When MangaDex carries no external links, we require a strong title match to
 * avoid surfacing an unrelated Atsumaru title.
 */
export async function findAtsuManga(opts: {
  title: string;
  links?: LinkMap;
}): Promise<AtsuMatch | null> {
  const candidates = await searchAtsu(opts.title, 5);
  if (!candidates.length) return null;

  const expected = expectedLinks(opts.links);
  const hasLinks = Object.keys(expected).length > 0;
  const checkOrder = candidates.slice(0, 3);

  const resolved = await Promise.all(
    checkOrder.map(async (candidate) => {
      try {
        return { candidate, manga: await fetchAtsuManga(candidate.id) };
      } catch {
        return null;
      }
    }),
  );

  for (const entry of resolved) {
    if (!entry) continue;
    const { candidate, manga } = entry;
    if (hasLinks) {
      const matched = Object.entries(expected).some(([field, value]) => {
        const actual = (manga as unknown as Record<string, unknown>)[field];
        return (
          actual !== null &&
          actual !== undefined &&
          String(actual) === String(value)
        );
      });
      if (matched) return { manga, matchedByLink: true };
    } else if (titleHits(opts.title, [candidate.title, candidate.englishTitle])) {
      return { manga, matchedByLink: false };
    }
  }

  if (!hasLinks || !titleHits(opts.title, [candidates[0].title, candidates[0].englishTitle])) return null;
  try {
    return { manga: await fetchAtsuManga(candidates[0].id), matchedByLink: false };
  } catch {
    return null;
  }
}

/** Choose the scanlation group with the most translated chapters. */
export function primaryScanlator(
  scanlators: AtsuScanlator[],
  chapters: AtsuChapter[],
): { id: string; name: string } | null {
  const counts = new Map<string, number>();
  for (const chapter of chapters) {
    counts.set(
      chapter.scanlationMangaId,
      (counts.get(chapter.scanlationMangaId) ?? 0) + 1,
    );
  }
  let best: { id: string; name: string } | null = null;
  let bestCount = -1;
  for (const scanlator of scanlators) {
    const count = counts.get(scanlator.id) ?? 0;
    if (count > bestCount) {
      best = scanlator;
      bestCount = count;
    }
  }
  return best;
}

export function chaptersOfScanlator(
  chapters: AtsuChapter[],
  scanlationMangaId: string,
): AtsuChapter[] {
  return chapters
    .filter((chapter) => chapter.scanlationMangaId === scanlationMangaId)
    .sort((a, b) => a.index - b.index);
}

export type AtsuReader = {
  chapterLabel: string;
  chapterNumber: number | null;
  chapters: { id: string; label: string }[];
  pages: { id: string; image: string; width?: number; height?: number }[];
  prevHref: string | null;
  nextHref: string | null;
};

/**
 * Assemble reader data for an Atsumaru chapter, including prev/next navigation
 * within the chapter's scanlation group.
 */
export async function buildAtsuReader(opts: {
  mangaId: string;
  atsuMangaId: string;
  atsuChapters: AtsuChapter[];
  chapterId: string;
}): Promise<AtsuReader | null> {
  const { atsuChapters, chapterId } = opts;
  const current = atsuChapters.find((item) => item.id === chapterId);
  if (!current) return null;
  const chapter = await fetchAtsuChapter(opts.atsuMangaId, chapterId);
  const sorted = [...atsuChapters].sort((a, b) => a.index - b.index);
  const groupChapters = sorted.filter(
    (item) => item.scanlationMangaId === current.scanlationMangaId,
  );
  const currentIndex = groupChapters.findIndex((item) => item.id === chapterId);
  const prev = currentIndex > 0 ? groupChapters[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < groupChapters.length - 1
      ? groupChapters[currentIndex + 1]
      : null;

  return {
    chapterLabel: chapter.title
      ? chapter.title
      : atsuChapterLabel({ title: chapter.title, number: null }),
    chapterNumber: current.number ?? null,
    chapters: groupChapters.map((item) => ({
      id: item.id,
      label: atsuChapterLabel(item),
    })),
    pages: chapter.pages.map((page) => ({
      id: page.id,
      image: atsuPageUrl(page),
      width: page.width,
      height: page.height,
    })),
    prevHref: prev ? `/read/${opts.mangaId}/${prev.id}` : null,
    nextHref: next ? `/read/${opts.mangaId}/${next.id}` : null,
  };
}
