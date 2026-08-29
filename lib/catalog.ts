import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  fetchMangaById,
  fetchSearch,
  MangaDexError,
  type Manga,
  type MangaListResult,
} from "./mangadex";
import {
  AniListError,
  fetchAniListById,
  fetchAniListByIds,
  fetchAniListList,
  searchAniList,
  searchAniListByAuthor,
} from "./anilist";
import {
  atsuPosterUrl,
  fetchAtsuManga,
  findAtsuCandidateByAniListId,
  findAtsuManga,
  listAtsuManga,
  searchAtsu,
  type AtsuCandidate,
} from "./atsu";
import { createClient } from "@/lib/supabase/server";
import { parseMangaId, toMangaId } from "./source";
import { normalizeTitleKey, titleHits } from "./title";
import { type SortKey } from "./genres";

type AtsuLike = {
  id: string;
  title: string | null;
  englishTitle?: string | null;
  status?: string | null;
  year?: number | null;
  type?: string;
  medium?: string;
  poster?: string | null;
  otherNames?: string[];
  anilistId?: number | null;
  malId?: number | null;
  kitsuId?: number | null;
  apId?: string | null;
  mangaUpdatesId?: string | null;
  genres?: string[];
  rating?: number;
};

const ADULT_GENRES = new Set([
  "adult",
  "smut",
  "erotica",
  "ecchi",
  "hentai",
  "pornographic",
  "porn",
  "sexual",
  "nsfw",
  "mature",
  "lolicon",
  "shotacon",
  "guro",
]);

export function curatedAtsuGenres(genres: string[] | undefined): string[] {
  if (!genres?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const genre of genres) {
    const normalized = genre.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (ADULT_GENRES.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function atsuTypeToMangaType(
  type: string | undefined,
  medium: string | undefined,
): Manga["type"] | undefined {
  const value = (type ?? medium ?? "").toLowerCase();
  if (value.includes("manhwa")) return "Manhwa";
  if (value.includes("manhua")) return "Manhua";
  if (value.includes("one-shot") || value.includes("oneshot")) return "One-shot";
  if (value.includes("novel")) return "Novel";
  if (value.includes("manga")) return "Manga";
  return undefined;
}

export function atsuToManga(atsu: AtsuLike): Manga {
  const links: Record<string, string> = {};
  if (atsu.anilistId) links.al = String(atsu.anilistId);
  if (atsu.malId) links.mal = String(atsu.malId);
  if (atsu.kitsuId) links.kt = String(atsu.kitsuId);
  if (atsu.apId) links.ap = atsu.apId;
  if (atsu.mangaUpdatesId) links.mu = atsu.mangaUpdatesId;

  const title = atsu.title ?? atsu.englishTitle ?? "Untitled";
  const altTitles = [atsu.englishTitle, ...(atsu.otherNames ?? [])].filter(
    (value): value is string =>
      typeof value === "string" && normalizeTitleKey(value) !== normalizeTitleKey(title),
  );

  return {
    id: toMangaId("atsu", atsu.id),
    title,
    altTitles: altTitles.length ? altTitles : undefined,
    coverUrl: atsuPosterUrl(atsu.poster ?? null),
    genres: curatedAtsuGenres(atsu.genres),
    rating: atsu.rating,
    status: atsu.status ?? undefined,
    year: atsu.year ?? undefined,
    availableLanguages: ["en"],
    links: Object.keys(links).length ? links : undefined,
    type: atsuTypeToMangaType(atsu.type, atsu.medium),
  };
}

const EMPTY_SEARCH: MangaListResult = { data: [], total: 0, offset: 0, limit: 24 };

export const CATALOG_PAGE_SIZE = 24;
export const SEARCH_POOL_SIZE = 60;

export type BrowseOptions = {
  sort: SortKey;
  genres: string[];
  status?: string;
  rating?: string;
  origin?: string;
  yearFrom?: number;
  yearTo?: number;
  minScore?: number;
  page?: number;
};

const cachedBrowseCatalog = unstable_cache(
  async (options: BrowseOptions): Promise<MangaListResult> => {
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * CATALOG_PAGE_SIZE;
    // Browse is AniList-only. The previous MangaDex fallback poisoned the
    // Data Cache in prod (transient AniList 429 -> watermarked
    // uploads.mangadex.org covers cached for 300s, mixed al:/mangadex ids
    // across pages). Let callers handle AniList errors as "unavailable"
    // instead of caching a degraded dataset.
    return fetchAniListList({
      limit: CATALOG_PAGE_SIZE,
      offset,
      sort: options.sort,
      genres: options.genres,
      status: options.status,
      rating: options.rating,
      origin: options.origin,
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
      minScore: options.minScore,
    });
  },
  ["catalog-browse-v2"],
  { revalidate: 300, tags: ["catalog-browse"] },
);

export function fetchBrowseCatalog(options: BrowseOptions): Promise<MangaListResult> {
  return cachedBrowseCatalog(options);
}

const cachedSearchCatalog = unstable_cache(
  (query: string) => searchCatalog(query, SEARCH_POOL_SIZE),
  ["catalog-search"],
  { revalidate: 300 },
);

const cachedAuthorCatalog = unstable_cache(
  (author: string) => searchCatalogByAuthor(author, SEARCH_POOL_SIZE),
  ["catalog-author-search"],
  { revalidate: 300 },
);

export function fetchCachedSearchCatalog(query: string): Promise<MangaListResult> {
  return cachedSearchCatalog(query);
}

export function fetchCachedAuthorCatalog(author: string): Promise<AuthorSearchResult> {
  return cachedAuthorCatalog(author);
}

export function isNotFoundError(error: unknown): boolean {
  return (
    (error instanceof MangaDexError || error instanceof AniListError) &&
    error.status === 404
  );
}

export async function searchCatalog(
  query: string,
  limit = 24,
): Promise<MangaListResult> {
  const [al, atsu] = await Promise.all([
    searchAniList(query, limit)
      .catch(() => fetchSearch(query, limit).catch(() => EMPTY_SEARCH)),
    searchAtsu(query, 12).catch(() => [] as AtsuCandidate[]),
  ]);

  const seen = new Set<string>();
  const data: Manga[] = [];

  for (const manga of al.data) {
    const idKey = manga.links?.al ? `al:${manga.links.al}` : null;
    const titleKey = normalizeTitleKey(manga.title);
    if (idKey && seen.has(idKey)) continue;
    if (titleKey && seen.has(titleKey)) continue;
    if (idKey) seen.add(idKey);
    if (titleKey) seen.add(titleKey);
    data.push(manga);
  }

  for (const candidate of atsu) {
    if (
      !titleHits(query, [
        candidate.title,
        candidate.englishTitle,
        ...(candidate.otherNames ?? []),
      ])
    ) {
      continue;
    }
    const manga = atsuToManga(candidate);
    const idKey = manga.links?.al ? `al:${manga.links.al}` : null;
    const titleKey = normalizeTitleKey(manga.title);
    if (idKey && seen.has(idKey)) continue;
    if (titleKey && seen.has(titleKey)) continue;
    if (idKey) seen.add(idKey);
    if (titleKey) seen.add(titleKey);
    data.push(manga);
  }

  await enrichAtsuBatch(data);

  return { data, total: data.length, offset: 0, limit };
}

/**
 * Batch-enrich Atsu-only entries that have an AniList link but lack
 * AniList metadata (rating, banner, description). Silently skips entries
 * that already have a rating, and entries without an AniList link.
 */
async function enrichAtsuBatch(data: Manga[]): Promise<void> {
  const alIds = data
    .filter((m) => m.rating == null && m.links?.al)
    .map((m) => m.links!.al!);
  if (!alIds.length) return;
  const alMetas = await fetchAniListByIds(alIds).catch(() => []);
  const metaByAl = Object.fromEntries(
    alMetas.map((m) => [m.links?.al, m]),
  );
  for (let i = 0; i < data.length; i++) {
    const alId = data[i].links?.al;
    if (!alId) continue;
    const meta = metaByAl[alId];
    if (!meta) continue;
    data[i] = {
      ...data[i],
      rating: data[i].rating ?? meta.rating,
      bannerUrl: data[i].bannerUrl ?? meta.bannerUrl,
      description: data[i].description ?? meta.description,
    };
  }
}

export type AuthorSearchResult = MangaListResult & {
  /** Canonical staff name AniList matched, when it found one. */
  authorName?: string;
  /** Profile image from AniList, when available. */
  authorImageUrl?: string | null;
};

/**
 * Author search. Backed entirely by AniList (staff lookup + staffMedia), so
 * errors propagate — callers treat them as "AniList is down" and fall back
 * to plain title search. Atsumaru hits are appended when their linked
 * AniList id or title matches an AniList result, so readers land on
 * chapter-carrying records where possible.
 */
export async function searchCatalogByAuthor(
  author: string,
  limit = 60,
): Promise<AuthorSearchResult> {
  const al = await searchAniListByAuthor(author, limit);
  const atsu = await searchAtsu(author, 24).catch(() => [] as AtsuCandidate[]);

  const data: Manga[] = [];
  const alIds = new Set<string>();
  const titleKeys = new Set<string>();
  for (const manga of al.data) {
    if (manga.links?.al) alIds.add(manga.links.al);
    titleKeys.add(normalizeTitleKey(manga.title));
    data.push(manga);
  }

  for (const candidate of atsu) {
    const manga = atsuToManga(candidate);
    const matchesAl =
      (manga.links?.al ? alIds.has(manga.links.al) : false) ||
      titleKeys.has(normalizeTitleKey(manga.title));
    if (!matchesAl) continue;
    data.push(manga);
  }

  await enrichAtsuBatch(data);

  return { data, total: data.length, offset: 0, limit, authorName: al.authorName, authorImageUrl: al.authorImageUrl };
}

/**
 * MangaDex records carry no banner and serve watermarked covers. When the
 * record links to an AniList entry we fetch it and overlay its banner, cover
 * and description. This runs at the catalog data layer so every consumer —
 * detail pages, the home hero, library and continue-reading — gets the clean
 * media, not just the detail page. Skips manga that already have a banner and
 * falls back silently when AniList is unreachable.
 */
export async function enhanceWithAniList(manga: Manga): Promise<Manga> {
  if (manga.bannerUrl || !manga.links?.al) return manga;
  try {
    const al = await fetchAniListById(manga.links.al);
    return {
      ...manga,
      bannerUrl: al.bannerUrl ?? manga.bannerUrl,
      coverUrl: al.coverUrl ?? manga.coverUrl,
      description: al.description ?? manga.description,
      rating: al.rating ?? manga.rating,
      authors: al.authors ?? manga.authors,
    };
  } catch {
    return manga;
  }
}

const cachedCatalogManga = unstable_cache(
  async (id: string, withStats: boolean): Promise<Manga> => {
    const { source, ref } = parseMangaId(id);
    let manga: Manga;
    if (source === "atsu") {
      manga = atsuToManga(await fetchAtsuManga(ref));
    } else if (source === "al") {
      manga = await fetchAniListById(ref);
    } else {
      manga = await fetchMangaById(ref, { withStats });
      const cleanCover = await resolveCleanCover(manga);
      if (cleanCover) manga.coverUrl = cleanCover;
    }
    return enhanceWithAniList(manga);
  },
  ["catalog-manga"],
  { revalidate: 300 },
);

/**
 * Last-known-good copies of catalog manga. When an upstream provider goes
 * down past the revalidate window (unstable_cache throws on failed
 * regeneration), these keep pages working for everyone — guests included.
 */
const STALE_MANGA_LIMIT = 1000;
const staleMangaStore = new Map<string, { value: Manga; storedAt: number }>();

function rememberManga(id: string, manga: Manga): void {
  if (staleMangaStore.size >= STALE_MANGA_LIMIT && !staleMangaStore.has(id)) {
    const oldest = staleMangaStore.keys().next().value;
    if (oldest !== undefined) staleMangaStore.delete(oldest);
  }
  staleMangaStore.delete(id);
  staleMangaStore.set(id, { value: manga, storedAt: Date.now() });
}

async function catalogMangaResilient(
  id: string,
  withStats: boolean,
): Promise<Manga> {
  try {
    const manga = await cachedCatalogManga(id, withStats);
    rememberManga(id, manga);
    return manga;
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    const stale = staleMangaStore.get(id)?.value;
    if (stale) return stale;
    throw error;
  }
}

/**
 * MangaDex now serves watermarked cover art from uploads.mangadex.org. When an
 * Atsumaru record matches the same title we swap in its (clean) poster so the
 * detail page, library and reader header don't show the watermarked image.
 */
async function resolveCleanCover(manga: Manga): Promise<string | null> {
  try {
    const match = await findAtsuManga({ title: manga.title, links: manga.links });
    return match ? atsuPosterUrl(match.manga.poster ?? null) : null;
  } catch {
    return null;
  }
}

export const fetchCatalogManga = cache(
  (id: string, options: { withStats?: boolean } = {}): Promise<Manga> =>
    catalogMangaResilient(id, options.withStats ?? false),
);

/**
 * Stored copy of a manga from the user's library. Serves as the fallback
 * metadata source when the upstream provider (e.g. AniList) is unreachable,
 * so library entries keep working without re-resolving anything.
 */
export async function fetchStoredManga(id: string): Promise<Manga | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: rows } = await supabase
      .from("hana_library")
      .select("manga_id, manga")
      .eq("user_id", data.user.id)
      .eq("manga_id", id)
      .limit(1);
    const row = (
      rows as { manga_id: string; manga: Manga | null }[] | null
    )?.[0];
    const manga = row?.manga;
    if (!manga || typeof manga !== "object" || !manga.title) return null;
    return manga.id === row.manga_id ? manga : { ...manga, id: row.manga_id };
  } catch {
    return null;
  }
}

export async function fetchCatalogMangaWithFallback(
  id: string,
  options: { withStats?: boolean } = {},
): Promise<Manga> {
  try {
    return await fetchCatalogManga(id, options);
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    const stored = await fetchStoredManga(id);
    if (stored) {
      rememberManga(id, stored);
      return stored;
    }
    // No library copy: resolve `al:<id>` via Atsumaru's link index so
    // guests aren't stranded when AniList is down.
    const { source, ref } = parseMangaId(id);
    if (source === "al") {
      try {
        const candidate = await findAtsuCandidateByAniListId(ref);
        if (candidate) {
          // Keep the original `al:` id — the atsu id would break reader
          // and library URLs.
          const manga = { ...atsuToManga(candidate), id };
          rememberManga(id, manga);
          return manga;
        }
      } catch {
        // Atsumaru unreachable too — rethrow the original error below.
      }
    }
    throw error;
  }
}

const cachedAtsuRow = unstable_cache(
  async (type: string, limit: number): Promise<Manga[]> => {
    const candidates = await listAtsuManga({ type, limit });
    return candidates.map(atsuToManga);
  },
  ["catalog-atsu-row"],
  { revalidate: 300 },
);

export function getAtsuRow(type: string, limit = 18): Promise<Manga[]> {
  return cachedAtsuRow(type, limit);
}
