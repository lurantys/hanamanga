import { unstable_cache } from "next/cache";
import {
  fetchMangaById,
  fetchSearch,
  type Manga,
  type MangaListResult,
} from "./mangadex";
import {
  atsuPosterUrl,
  fetchAtsuManga,
  listAtsuManga,
  searchAtsu,
  type AtsuCandidate,
} from "./atsu";
import { parseMangaId, toMangaId } from "./source";
import { normalizeTitleKey, titleHits } from "./title";

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
};

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
    genres: [],
    status: atsu.status ?? undefined,
    year: atsu.year ?? undefined,
    availableLanguages: ["en"],
    links: Object.keys(links).length ? links : undefined,
  };
}

const EMPTY_SEARCH: MangaListResult = { data: [], total: 0, offset: 0, limit: 24 };

export async function searchCatalog(
  query: string,
  limit = 24,
): Promise<MangaListResult> {
  const [md, atsu] = await Promise.all([
    fetchSearch(query, limit).catch(() => EMPTY_SEARCH),
    searchAtsu(query, 12).catch(() => [] as AtsuCandidate[]),
  ]);

  const seen = new Set<string>();
  const data: Manga[] = [];

  for (const manga of md.data) {
    const key = normalizeTitleKey(manga.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
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
    const key = normalizeTitleKey(
      candidate.title ?? candidate.englishTitle ?? "",
    );
    if (!key || seen.has(key)) continue;
    seen.add(key);
    data.push(atsuToManga(candidate));
  }

  return { data, total: data.length, offset: 0, limit };
}

export async function fetchCatalogManga(
  id: string,
  options: { withStats?: boolean } = {},
): Promise<Manga> {
  const { source, ref } = parseMangaId(id);
  if (source === "atsu") {
    return atsuToManga(await fetchAtsuManga(ref));
  }
  return fetchMangaById(ref, { withStats: options.withStats });
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
