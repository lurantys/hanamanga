import { tagIdFor } from "./genres";

const API = "https://api.mangadex.org";
export const UPLOADS = "https://uploads.mangadex.org";
const CONTENT_RATINGS = ["safe", "suggestive"];

export type Manga = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string | null;
  genres: string[];
  rating?: number;
  follows?: number;
  year?: number;
  status?: string;
  availableLanguages: string[];
  latestChapter?: string;
  links?: Record<string, string>;
};

export type Chapter = {
  id: string;
  title?: string | null;
  volume?: string | null;
  chapter?: string | null;
  pages: number;
  translatedLanguage: string;
  externalUrl?: string | null;
  publishedAt?: string;
};

export type VolumeChapter = {
  id: string;
  chapter: string;
  count: number;
};

export type MangaListResult = {
  data: Manga[];
  total: number;
  offset: number;
  limit: number;
};

type ApiManga = {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Record<string, string>[];
    description: Record<string, string>;
    status?: string;
    year?: number;
    tags: { id: string; attributes: { name: { en?: string } } }[];
    availableTranslatedLanguages?: string[];
    latestUploadedChapter?: string;
    links?: Record<string, string>;
  };
  relationships: {
    type: string;
    id: string;
    attributes?: { fileName?: string; name?: Record<string, string> };
  }[];
};

type ApiChapter = {
  id: string;
  attributes: {
    title?: string | null;
    volume?: string | null;
    chapter?: string | null;
    pages: number;
    translatedLanguage: string;
    externalUrl?: string | null;
    publishAt?: string;
  };
};

type ApiStatistics = {
  statistics: Record<string, { follows?: number; rating?: { bayesian?: number } }>;
};

function paramsToString(
  params: Record<string, string | string[] | number | boolean | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) usp.append(key, String(item));
    } else {
      usp.append(key, String(value));
    }
  }
  return usp.toString();
}

async function mdFetch<T>(
  path: string,
  params: Record<string, string | string[] | number | boolean | undefined> = {},
): Promise<T> {
  const query = paramsToString(params);
  const url = query ? `${API}${path}?${query}` : `${API}${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "Hana/1.0" } });
  if (!res.ok) {
    throw new Error(`MangaDex request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function pickTitle(
  title: Record<string, string>,
  altTitles?: Record<string, string>[],
): string {
  if (title?.en?.trim()) return title.en.trim();
  const altEn = altTitles
    ?.map((alt) => alt?.en)
    .find((value): value is string => typeof value === "string" && value.trim() !== "");
  if (altEn?.trim()) return altEn.trim();
  const fallback = Object.values(title ?? {}).find(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
  if (fallback) return fallback.trim();
  for (const alt of altTitles ?? []) {
    const value = Object.values(alt).find(
      (entry): entry is string => typeof entry === "string" && entry.trim() !== "",
    );
    if (value) return value.trim();
  }
  return "Untitled";
}

function pickDescription(description: Record<string, string>): string {
  return (
    description?.en ||
    Object.values(description ?? {}).find(
      (value): value is string => typeof value === "string" && value.trim() !== "",
    ) ||
    ""
  );
}

function normalizeManga(api: ApiManga): Manga {
  const attrs = api.attributes;
  const cover = api.relationships?.find(
    (relationship) => relationship.type === "cover_art",
  );
  const coverFile = cover?.attributes?.fileName;

  return {
    id: api.id,
    title: pickTitle(attrs.title, attrs.altTitles),
    description: pickDescription(attrs.description) || undefined,
    coverUrl: coverFile
      ? `${UPLOADS}/covers/${api.id}/${coverFile}.512.jpg`
      : null,
    genres: (attrs.tags ?? [])
      .map((tag) => tag.attributes?.name?.en)
      .filter((name): name is string => Boolean(name)),
    year: attrs.year,
    status: attrs.status,
    availableLanguages: attrs.availableTranslatedLanguages ?? [],
    latestChapter: attrs.latestUploadedChapter,
    links: attrs.links,
  };
}

async function enrichWithStats(manga: Manga[]): Promise<void> {
  const ids = manga.map((item) => item.id);
  if (!ids.length) return;

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const params: Record<string, string[]> = { "manga[]": chunk };
    const json = await mdFetch<ApiStatistics>("/statistics/manga", params);
    for (const item of manga) {
      const stats = json.statistics?.[item.id];
      item.rating = stats?.rating?.bayesian;
      item.follows = stats?.follows;
    }
  }
}

export type MangaListOptions = {
  limit?: number;
  offset?: number;
  title?: string;
  order?: Record<string, string>;
  includedTags?: string[];
  availableLanguages?: string[];
};

export async function fetchMangaList(
  options: MangaListOptions = {},
): Promise<MangaListResult> {
  const params: Record<string, string | string[] | number> = {
    limit: options.limit ?? 24,
    offset: options.offset ?? 0,
    "includes[]": ["cover_art"],
    "contentRating[]": CONTENT_RATINGS,
    "availableTranslatedLanguage[]": options.availableLanguages ?? ["en"],
  };

  if (options.title) params.title = options.title;
  if (options.order) {
    for (const [key, value] of Object.entries(options.order)) {
      params[`order[${key}]`] = value;
    }
  }
  if (options.includedTags?.length) {
    params["includedTags[]"] = options.includedTags;
  }

  const json = await mdFetch<{
    data: ApiManga[];
    total: number;
    offset: number;
    limit: number;
  }>("/manga", params);

  const manga = (json.data ?? []).map(normalizeManga);
  await enrichWithStats(manga);

  return {
    data: manga,
    total: json.total ?? manga.length,
    offset: json.offset ?? 0,
    limit: json.limit ?? manga.length,
  };
}

export async function fetchTrending(limit = 18): Promise<MangaListResult> {
  return fetchMangaList({ limit, order: { followedCount: "desc" } });
}

export async function fetchPopular(limit = 18): Promise<MangaListResult> {
  return fetchMangaList({ limit, order: { followedCount: "desc" } });
}

export async function fetchTopRated(limit = 18): Promise<MangaListResult> {
  return fetchMangaList({ limit, order: { rating: "desc" } });
}

export async function fetchByGenre(genre: string, limit = 18): Promise<MangaListResult> {
  const tagId = tagIdFor(genre);
  return fetchMangaList({
    limit,
    order: { followedCount: "desc" },
    includedTags: tagId ? [tagId] : undefined,
  });
}

export async function fetchSearch(title: string, limit = 24): Promise<MangaListResult> {
  return fetchMangaList({
    limit,
    title,
    order: { relevance: "desc" },
  });
}

export async function fetchMangaById(id: string): Promise<Manga> {
  const json = await mdFetch<{ data: ApiManga }>(`/manga/${id}`, {
    "includes[]": ["cover_art", "author", "artist"],
  });
  const manga = normalizeManga(json.data);
  await enrichWithStats([manga]);
  return manga;
}

export async function fetchFeed(
  mangaId: string,
  limit = 500,
  order: Record<string, string> = { volume: "asc", chapter: "asc" },
): Promise<{ data: Chapter[]; total: number }> {
  const params: Record<string, string | string[] | number> = {
    "translatedLanguage[]": ["en"],
    "order[volume]": order.volume ?? "asc",
    "order[chapter]": order.chapter ?? "asc",
    limit,
    "includes[]": ["scanlation_group"],
  };
  const json = await mdFetch<{ data: ApiChapter[]; total: number }>(
    `/manga/${mangaId}/feed`,
    params,
  );
  return {
    data: (json.data ?? []).map((chapter) => ({
      id: chapter.id,
      title: chapter.attributes.title ?? null,
      volume: chapter.attributes.volume ?? null,
      chapter: chapter.attributes.chapter ?? null,
      pages: chapter.attributes.pages ?? 0,
      translatedLanguage: chapter.attributes.translatedLanguage,
      externalUrl: chapter.attributes.externalUrl ?? null,
      publishedAt: chapter.attributes.publishAt,
    })),
    total: json.total ?? 0,
  };
}

export async function fetchAggregate(
  mangaId: string,
): Promise<{ volumes: { volume: string | null; chapters: VolumeChapter[] }[] }> {
  const json = await mdFetch<{
    volumes: Record<
      string,
      { chapters: Record<string, { id: string; chapter: string; count: number }> }
    >;
  }>(`/manga/${mangaId}/aggregate`, {
    "translatedLanguage[]": ["en"],
  });

  const volumes = Object.entries(json.volumes ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([volume, data]) => ({
      volume: volume === "none" ? null : volume,
      chapters: Object.entries(data.chapters ?? {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, chapterData]) => ({
          id: chapterData.id,
          chapter: chapterData.chapter,
          count: chapterData.count ?? 0,
        })),
    }));

  return { volumes };
}

export async function fetchChapterReader(
  chapterId: string,
): Promise<{ baseUrl: string; hash: string; pages: string[] }> {
  const json = await mdFetch<{
    baseUrl: string;
    chapter: { hash: string; data: string[] };
  }>(`/at-home/server/${chapterId}`);
  return {
    baseUrl: json.baseUrl,
    hash: json.chapter.hash,
    pages: json.chapter.data ?? [],
  };
}

export async function fetchChapterById(chapterId: string): Promise<Chapter> {
  const json = await mdFetch<{ data: ApiChapter }>(`/chapter/${chapterId}`);
  const chapter = json.data;
  return {
    id: chapter.id,
    title: chapter.attributes.title ?? null,
    volume: chapter.attributes.volume ?? null,
    chapter: chapter.attributes.chapter ?? null,
    pages: chapter.attributes.pages ?? 0,
    translatedLanguage: chapter.attributes.translatedLanguage,
    externalUrl: chapter.attributes.externalUrl ?? null,
    publishedAt: chapter.attributes.publishAt,
  };
}

export function chapterPageUrl(baseUrl: string, hash: string, file: string): string {
  return `${baseUrl}/data/${hash}/${file}`;
}

export function chapterLink(chapterId: string): string {
  return `https://mangadex.org/chapter/${chapterId}`;
}

export function mangaLink(mangaId: string): string {
  return `https://mangadex.org/title/${mangaId}`;
}

export function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    ongoing: "Ongoing",
    completed: "Completed",
    hiatus: "Hiatus",
    cancelled: "Cancelled",
    discontinued: "Discontinued",
  };
  return (status && labels[status]) || status || "Unknown";
}

export function truncate(text: string | null | undefined, max = 260): string {
  if (!text) return "";
  const cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trimEnd()}…`;
}

export function formatFollows(follows?: number): string {
  if (!follows) return "0";
  if (follows >= 1_000_000) return `${(follows / 1_000_000).toFixed(1)}M`;
  if (follows >= 1_000) return `${(follows / 1_000).toFixed(1)}K`;
  return String(follows);
}
