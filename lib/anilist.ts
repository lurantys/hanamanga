import { toMangaId } from "./source";
import type { Manga, MangaListResult } from "./mangadex";

const API = "https://graphql.anilist.co";

export type AniListSort = "popular" | "trending" | "top";

export type AniListMedia = {
  id: number;
  idMal?: number | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  synonyms?: string[] | null;
  description?: string | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  bannerImage?: string | null;
  genres?: string[] | null;
  averageScore?: number | null;
  popularity?: number | null;
  status?: string | null;
  startDate?: { year?: number | null } | null;
  chapters?: number | null;
  format?: string | null;
  source?: string | null;
  countryOfOrigin?: string | null;
  isAdult?: boolean | null;
  updatedAt?: number | null;
};

export const ANILIST_MEDIA_FIELDS = /* GraphQL */ `
  id
  idMal
  title { romaji english native }
  synonyms
  description
  coverImage { large extraLarge }
  bannerImage
  genres
  averageScore
  popularity
  status
  startDate { year }
  chapters
  format
  source
  countryOfOrigin
  isAdult
  updatedAt
`;

const LIST_QUERY = /* GraphQL */ `
  query CatalogPage(
    $page: Int
    $perPage: Int
    $sort: [MediaSort]
    $search: String
    $genre_in: [String]
    $status: MediaStatus
    $isAdult: Boolean
    $ids: [Int]
    $countryOfOrigin: CountryCode
    $startDate_greater: FuzzyDateInt
    $startDate_lesser: FuzzyDateInt
    $averageScore_greater: Int
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total }
      media(
        type: MANGA
        search: $search
        sort: $sort
        genre_in: $genre_in
        status: $status
        isAdult: $isAdult
        id_in: $ids
        countryOfOrigin: $countryOfOrigin
        startDate_greater: $startDate_greater
        startDate_lesser: $startDate_lesser
        averageScore_greater: $averageScore_greater
        format_not_in: [NOVEL, ONE_SHOT]
      ) {
        ${ANILIST_MEDIA_FIELDS}
      }
    }
  }
`;

const MEDIA_QUERY = /* GraphQL */ `
  query CatalogMedia($id: Int) {
    Media(id: $id, type: MANGA) {
      ${ANILIST_MEDIA_FIELDS}
    }
  }
`;

const IDMAL_QUERY = /* GraphQL */ `
  query CatalogByIdMal($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(
        type: MANGA
        idMal_in: $ids
        isAdult: false
        format_not_in: [NOVEL, ONE_SHOT]
      ) {
        ${ANILIST_MEDIA_FIELDS}
      }
    }
  }
`;

const SORT_TO_ANILIST: Record<AniListSort, string> = {
  popular: "POPULARITY_DESC",
  trending: "TRENDING_DESC",
  top: "SCORE_DESC",
};

const STATUS_TO_ANILIST: Record<string, string> = {
  ongoing: "RELEASING",
  completed: "FINISHED",
  hiatus: "HIATUS",
  cancelled: "CANCELLED",
};

const CACHE_TTL = 60_000;
const anilistCache = new Map<
  string,
  { expires: number; promise: Promise<unknown> }
>();

export class AniListError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AniListError";
    this.status = status;
  }
}

async function queryAnilistAuth<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Hana/1.0",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return queryAnilistAuth<T>(token, query, variables);
  }
  const json = (await res.json().catch(() => null)) as {
    data?: T;
    errors?: { status?: number; message?: string }[];
  } | null;
  const error = json?.errors?.[0];
  if (error) {
    throw new AniListError(
      error.message ?? "AniList request failed",
      error.status ?? res.status,
    );
  }
  if (!json?.data) {
    throw new AniListError("AniList returned no data", res.status);
  }
  return json.data as T;
}

const VIEWER_QUERY = /* GraphQL */ `
  query ViewerId {
    Viewer {
      id
    }
  }
`;

export async function fetchAniListViewerId(token: string): Promise<number> {
  const data = await queryAnilistAuth<{ Viewer?: { id?: number | null } | null }>(
    token,
    VIEWER_QUERY,
    {},
  );
  const id = data.Viewer?.id;
  if (!id) {
    throw new AniListError("AniList viewer not found", 401);
  }
  return id;
}

async function queryAnilist<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const key = `${query}\n${JSON.stringify(variables)}`;
  const cached = anilistCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.promise as Promise<T>;
  }
  const promise = (async () => {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Hana/1.0",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return queryAnilist<T>(query, variables);
    }
    const json = (await res.json().catch(() => null)) as {
      data?: T;
      errors?: { status?: number; message?: string }[];
    } | null;
    const error = json?.errors?.[0];
    if (error) {
      throw new AniListError(
        error.message ?? "AniList request failed",
        error.status ?? 500,
      );
    }
    if (!json?.data) {
      throw new AniListError("AniList returned no data", res.status);
    }
    return json.data as T;
  })();
  anilistCache.set(key, { expires: Date.now() + CACHE_TTL, promise });
  try {
    return (await promise) as T;
  } catch (error) {
    anilistCache.delete(key);
    throw error;
  }
}

function statusFromAniList(status?: string | null): string | undefined {
  switch (status) {
    case "RELEASING":
      return "ongoing";
    case "FINISHED":
      return "completed";
    case "HIATUS":
      return "hiatus";
    case "CANCELLED":
      return "cancelled";
    default:
      return undefined;
  }
}

function typeFromAniList(
  format?: string | null,
  country?: string | null,
): Manga["type"] | undefined {
  if (format === "NOVEL" || format === "ONE_SHOT") {
    return format === "NOVEL" ? "Novel" : "One-shot";
  }
  if (country === "KR") return "Manhwa";
  if (country === "CN") return "Manhua";
  if (country === "JP") return "Manga";
  return undefined;
}

function sourceFromAniList(source?: string | null): Manga["source"] | undefined {
  switch (source) {
    case "ORIGINAL":
      return "Original";
    case "MANGA":
      return "Manga";
    case "LIGHT_NOVEL":
      return "Light novel";
    case "WEB_NOVEL":
      return "Web novel";
    case "VISUAL_NOVEL":
      return "Visual novel";
    default:
      return undefined;
  }
}

export function anilistToManga(media: AniListMedia): Manga {
  const title =
    media.title?.english ??
    media.title?.romaji ??
    media.title?.native ??
    "Untitled";
  const altTitles = [
    media.title?.romaji,
    media.title?.english,
    media.title?.native,
    ...(media.synonyms ?? []),
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim() !== "" && value !== title,
  );
  const links: Record<string, string> = { al: String(media.id) };
  if (media.idMal) links.mal = String(media.idMal);

  return {
    id: toMangaId("al", String(media.id)),
    title,
    altTitles: altTitles.length ? [...new Set(altTitles)] : undefined,
    description: media.description ?? undefined,
    coverUrl: media.coverImage?.large ?? media.coverImage?.extraLarge ?? null,
    genres: media.genres ?? [],
    rating: media.averageScore != null ? media.averageScore / 10 : undefined,
    follows: media.popularity ?? undefined,
    year: media.startDate?.year ?? undefined,
    status: statusFromAniList(media.status),
    availableLanguages: ["en"],
    updatedAt: media.updatedAt
      ? new Date(media.updatedAt * 1000).toISOString()
      : undefined,
    bannerUrl: media.bannerImage ?? null,
    links,
    type: typeFromAniList(media.format, media.countryOfOrigin),
    source: sourceFromAniList(media.source),
  };
}

export async function fetchAniListList(opts: {
  limit?: number;
  offset?: number;
  sort?: AniListSort;
  genre?: string;
  genres?: string[];
  status?: string;
  rating?: string;
  origin?: string;
  yearFrom?: number;
  yearTo?: number;
  minScore?: number;
} = {}): Promise<MangaListResult> {
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const variables: Record<string, unknown> = {
    page,
    perPage: limit,
    sort: [SORT_TO_ANILIST[opts.sort ?? "popular"]],
  };
  const genres = opts.genres?.length
    ? opts.genres
    : opts.genre
      ? [opts.genre]
      : [];
  if (genres.length) variables.genre_in = genres;
  if (opts.status && STATUS_TO_ANILIST[opts.status]) {
    variables.status = STATUS_TO_ANILIST[opts.status];
  }
  if (opts.rating !== "erotica") variables.isAdult = false;
  if (opts.origin) variables.countryOfOrigin = opts.origin;
  if (opts.yearFrom) variables.startDate_greater = opts.yearFrom * 10000;
  if (opts.yearTo) variables.startDate_lesser = opts.yearTo * 10000 + 1231;
  if (opts.minScore) variables.averageScore_greater = opts.minScore * 10;

  const data = await queryAnilist<{
    Page?: { pageInfo?: { total?: number | null }; media?: AniListMedia[] | null };
  }>(LIST_QUERY, variables);
  const media = data.Page?.media ?? [];
  const total = data.Page?.pageInfo?.total ?? media.length;
  return { data: media.map(anilistToManga), total, offset, limit };
}

export async function searchAniList(
  query: string,
  limit = 24,
): Promise<MangaListResult> {
  const trimmed = query.trim();
  if (!trimmed) return { data: [], total: 0, offset: 0, limit };
  const data = await queryAnilist<{
    Page?: { pageInfo?: { total?: number | null }; media?: AniListMedia[] | null };
  }>(LIST_QUERY, {
    page: 1,
    perPage: limit,
    search: trimmed,
    sort: ["SEARCH_MATCH", "POPULARITY_DESC"],
    isAdult: false,
  });
  const media = data.Page?.media ?? [];
  return {
    data: media.map(anilistToManga),
    total: data.Page?.pageInfo?.total ?? media.length,
    offset: 0,
    limit,
  };
}

export async function fetchAniListById(id: string): Promise<Manga> {
  const parsed = Number(id);
  const data = await queryAnilist<{ Media?: AniListMedia | null }>(MEDIA_QUERY, {
    id: parsed,
  });
  if (!data.Media) {
    throw new AniListError("AniList media not found", 404);
  }
  return anilistToManga(data.Media);
}

export async function fetchAniListByIds(ids: string[]): Promise<Manga[]> {
  const numeric = ids
    .map((id) => Number(id))
    .filter((value) => Number.isFinite(value));
  if (!numeric.length) return [];
  const data = await queryAnilist<{
    Page?: { media?: AniListMedia[] | null };
  }>(LIST_QUERY, { page: 1, perPage: numeric.length, ids: numeric });
  return (data.Page?.media ?? []).map(anilistToManga);
}

export async function fetchAniListByMalIds(malIds: number[]): Promise<Manga[]> {
  if (!malIds.length) return [];
  const result: Manga[] = [];
  for (let i = 0; i < malIds.length; i += 50) {
    const chunk = malIds.slice(i, i + 50);
    const data = await queryAnilist<{
      Page?: { media?: AniListMedia[] | null };
    }>(IDMAL_QUERY, { ids: chunk });
    result.push(...(data.Page?.media ?? []).map(anilistToManga));
  }
  return result;
}
