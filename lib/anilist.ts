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
  staff?: {
    edges?: {
      role?: string | null;
      node?: {
        id?: number | null;
        name?: { full?: string | null } | null;
        image?: { large?: string | null } | null;
      } | null;
    }[] | null;
  } | null;
};

export type AniListStaffMember = {
  id: number;
  name: string;
  role?: string;
  imageUrl?: string | null;
};

export type AniListCharacter = {
  id: number;
  name: string;
  imageUrl?: string | null;
  role?: string;
  voiceActor?: { name: string; imageUrl?: string | null } | null;
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
      staff {
        edges {
          role
          node {
            id
            name { full }
            image { large }
          }
        }
      }
    }
  }
`;

const CHARACTERS_QUERY = /* GraphQL */ `
  query MangaCharacters($id: Int) {
    Media(id: $id, type: MANGA) {
      characters(sort: ROLE) {
        edges {
          role
          node {
            id
            name { full }
            image { large }
          }
          voiceActors(language: JAPANESE) {
            id
            name { full }
            image { large }
          }
        }
      }
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

const ID_LIST_QUERY = /* GraphQL */ `
  query CatalogByIds($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(type: MANGA, id_in: $ids, isAdult: false) {
        ${ANILIST_MEDIA_FIELDS}
      }
    }
  }
`;

const STAFF_SEARCH_QUERY = /* GraphQL */ `
  query StaffSearch($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      staff(search: $search, sort: [SEARCH_MATCH]) {
        id
        name { full }
        image { large }
      }
    }
  }
`;

const AUTHOR_MEDIA_QUERY = /* GraphQL */ `
  query AuthorMedia($staffId: Int, $perPage: Int) {
    Staff(id: $staffId) {
      name { full }
      image { large }
      staffMedia(type: MANGA, perPage: $perPage, sort: [POPULARITY_DESC]) {
        pageInfo { total }
        nodes {
          ${ANILIST_MEDIA_FIELDS}
        }
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
const MAX_RETRIES = 3;

function retryDelay(attempt: number): number {
  return 1000 * 2 ** attempt;
}

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

export const ANILIST_DOWN_MESSAGE =
  "The AniList API has been temporarily disabled due to severe stability issues.";

export function isAniListDownError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    /temporarily disabled|severe stability issues/i.test(message) ||
    (error instanceof AniListError && error.status === 403)
  );
}

async function queryAnilistAuth<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  attempt = 0,
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
    if (attempt >= MAX_RETRIES) {
      throw new AniListError("AniList rate limited", 429);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
    return queryAnilistAuth<T>(token, query, variables, attempt + 1);
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
  attempt = 0,
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
      if (attempt >= MAX_RETRIES) {
        throw new AniListError("AniList rate limited", 429);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
      return queryAnilist<T>(query, variables, attempt + 1);
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

function isCreatorRole(role?: string | null): boolean {
  if (!role) return true;
  const lower = role.toLowerCase();
  return !/translat|letter|touch-?up|proofread|retouch|publish|typeset|edit|adapt/.test(
    lower,
  );
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

  const staffEdges = media.staff?.edges ?? [];
  const authors = staffEdges.length
    ? staffEdges
        .filter(
          (edge): edge is NonNullable<typeof edge> =>
            Boolean(edge?.node?.name?.full) && isCreatorRole(edge.role),
        )
        .map((edge) => ({
          name: edge.node!.name!.full!,
          role: edge.role ?? undefined,
          imageUrl: edge.node?.image?.large ?? null,
        }))
    : undefined;

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
    authors,
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

type AniListStaffHit = { id: number; name: string; imageUrl?: string | null };

/**
 * Find staff whose name matches the query (most relevant matches first).
 * Throws when AniList is unreachable — callers use that as the signal that
 * author search is unavailable and fall back to plain title search.
 */
export async function searchAniListStaff(
  query: string,
  limit = 3,
): Promise<AniListStaffHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await queryAnilist<{
    Page?: {
      staff?: ({ id?: number | null; name?: { full?: string | null } | null; image?: { large?: string | null } | null } | null)[] | null;
    };
  }>(STAFF_SEARCH_QUERY, { search: trimmed, perPage: limit });
  return (data.Page?.staff ?? [])
    .filter(
      (staff): staff is { id: number; name: { full: string }; image?: { large?: string | null } | null } =>
        Boolean(staff?.id && staff.name?.full),
    )
    .map((staff) => ({ id: staff.id, name: staff.name.full, imageUrl: staff.image?.large ?? null }));
}

/**
 * Manga by a specific staff member, most popular first. Author search relies
 * entirely on AniList, so errors propagate (unlike title search).
 */
export async function searchAniListByAuthor(
  author: string,
  limit = 24,
): Promise<MangaListResult & { authorName?: string; authorImageUrl?: string | null }> {
  const staff = await searchAniListStaff(author, 1);
  const match = staff[0];
  if (!match) {
    return { data: [], total: 0, offset: 0, limit, authorName: undefined, authorImageUrl: undefined };
  }
  const data = await queryAnilist<{
    Staff?: {
      name?: { full?: string | null } | null;
      image?: { large?: string | null } | null;
      staffMedia?: {
        pageInfo?: { total?: number | null } | null;
        nodes?: AniListMedia[] | null;
      } | null;
    } | null;
  }>(AUTHOR_MEDIA_QUERY, { staffId: match.id, perPage: limit });
  const media = (data.Staff?.staffMedia?.nodes ?? [])
    .filter((node) => !node.isAdult)
    .map(anilistToManga);
  return {
    data: media,
    total: data.Staff?.staffMedia?.pageInfo?.total ?? media.length,
    offset: 0,
    limit,
    authorName: data.Staff?.name?.full ?? match.name,
    authorImageUrl: match.imageUrl ?? data.Staff?.image?.large ?? null,
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
  }>(ID_LIST_QUERY, { ids: numeric });
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

export async function fetchAniListCharacters(
  id: string,
): Promise<AniListCharacter[]> {
  const parsed = Number(id);
  const data = await queryAnilist<{
    Media?: {
      characters?: {
        edges?: {
          role?: string | null;
          node?: {
            id?: number | null;
            name?: { full?: string | null } | null;
            image?: { large?: string | null } | null;
          } | null;
          voiceActors?: {
            id?: number | null;
            name?: { full?: string | null } | null;
            image?: { large?: string | null } | null;
          }[] | null;
        }[] | null;
      } | null;
    } | null;
  }>(CHARACTERS_QUERY, { id: parsed });

  const edges = data.Media?.characters?.edges ?? [];
  return edges
    .filter((edge): edge is NonNullable<typeof edge> =>
      Boolean(edge?.node?.name?.full),
    )
    .map((edge) => {
      const voice = edge.voiceActors?.[0];
      return {
        id: edge.node!.id ?? 0,
        name: edge.node!.name!.full!,
        imageUrl: edge.node?.image?.large ?? null,
        role: edge.role ?? undefined,
        voiceActor: voice?.name?.full
          ? {
              name: voice.name.full,
              imageUrl: voice.image?.large ?? null,
            }
          : null,
      };
    });
}
