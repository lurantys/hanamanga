import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  fetchAggregate,
  fetchFeed,
  fetchMangaList,
  fetchTrending,
  type Chapter,
  type Manga,
  type MangaListResult,
} from "./mangadex";
import { tagIdFor } from "./genres";
import {
  chaptersOfScanlator,
  fetchAtsuChapters,
  fetchAtsuManga,
  findAtsuManga,
  primaryScanlator,
  type AtsuChapter,
  type AtsuMatch,
} from "./atsu";
import { fetchCatalogManga, getAtsuRow } from "./catalog";
import { parseMangaId } from "./source";
import { matchToMangaDex } from "./integrations";
import { fetchAniListList } from "./anilist";
import {
  fetchKatanaChapters,
  fetchKatanaFirstChapter,
  findKatanaManga,
  type KatanaChapter,
  type KatanaManga,
} from "./mangakatana";
import {
  fetchWeebFirstChapter,
  getWeebLookupData,
  type WeebChapter,
  type WeebManga,
} from "./weebcentral";

const HOME_ROWS_REVALIDATE = 300;
const SOURCE_REVALIDATE = 3600;

const cachedTrending = unstable_cache(
  async (limit = 18): Promise<MangaListResult> => {
    try {
      return await fetchAniListList({ limit, sort: "trending" });
    } catch {
      return fetchTrending(limit);
    }
  },
  ["home-trending"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedPopular = unstable_cache(
  async (limit = 18): Promise<MangaListResult> => {
    try {
      return await fetchAniListList({ limit, sort: "popular" });
    } catch {
      return fetchMangaList({ limit, order: { followedCount: "desc" } });
    }
  },
  ["home-popular"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedTopRated = unstable_cache(
  async (limit = 18): Promise<MangaListResult> => {
    try {
      return await fetchAniListList({ limit, sort: "top" });
    } catch {
      return fetchMangaList({ limit, order: { rating: "desc" } });
    }
  },
  ["home-top-rated"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedByGenre = unstable_cache(
  async (genre: string, limit = 18): Promise<MangaListResult> => {
    try {
      return await fetchAniListList({ limit, genre, sort: "popular" });
    } catch {
      const tagId = tagIdFor(genre);
      return fetchMangaList({
        limit,
        order: { followedCount: "desc" },
        includedTags: tagId ? [tagId] : undefined,
      });
    }
  },
  ["home-by-genre"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

export const getTrending = cache((limit = 18) => cachedTrending(limit));
export const getPopular = cache((limit = 18) => cachedPopular(limit));
export const getTopRated = cache((limit = 18) => cachedTopRated(limit));
export const getByGenre = cache((genre: string, limit = 18) =>
  cachedByGenre(genre, limit),
);
export const getWebtoons = cache((limit = 18) => getAtsuRow("Manwha", limit));
export const getManhua = cache((limit = 18) => getAtsuRow("Manhua", limit));

export function pickHero(manga: Manga[]): Manga | null {
  if (!manga.length) return null;
  return manga[Math.floor(Math.random() * manga.length)] ?? null;
}

export type AtsuMatchData = {
  match: AtsuMatch;
  chapters: AtsuChapter[];
};

const cachedAtsuMatch = unstable_cache(
  async (mangaId: string): Promise<AtsuMatchData | null> => {
    const { source, ref } = parseMangaId(mangaId);
    if (source === "atsu") {
      const manga = await fetchAtsuManga(ref);
      const chapters = await fetchAtsuChapters(ref).catch(() => manga.chapters);
      return { match: { manga, matchedByLink: true }, chapters };
    }
    try {
      const manga = await fetchCatalogManga(mangaId, { withStats: false });
      const match = await findAtsuManga({ title: manga.title, links: manga.links });
      if (!match) return null;
      const chapters = await fetchAtsuChapters(match.manga.id);
      return { match, chapters };
    } catch {
      return null;
    }
  },
  ["resolve-atsu-match"],
  { revalidate: SOURCE_REVALIDATE },
);

export const getAtsuMatch = cache((mangaId: string) => cachedAtsuMatch(mangaId));

export type KatanaLookup = {
  manga: KatanaManga | null;
  chapters: KatanaChapter[];
};

const cachedKatanaLookup = unstable_cache(
  async (title: string): Promise<KatanaLookup> => {
    const manga = await findKatanaManga(title);
    if (!manga) return { manga: null, chapters: [] };
    const chapters = await fetchKatanaChapters(manga);
    return { manga, chapters };
  },
  ["resolve-katana-lookup"],
  { revalidate: SOURCE_REVALIDATE },
);

export const getKatanaLookup = cache((title: string) => cachedKatanaLookup(title));

export type WeebLookup = {
  manga: WeebManga | null;
  chapters: WeebChapter[];
};

const cachedWeebLookup = unstable_cache(
  async (title: string, altTitles: string[]): Promise<WeebLookup> => {
    const lookup = await getWeebLookupData([title, ...altTitles]);
    return { manga: lookup.manga, chapters: lookup.chapters };
  },
  ["resolve-weeb-lookup"],
  { revalidate: SOURCE_REVALIDATE },
);

export const getWeebLookup = cache(
  (manga: { title: string; altTitles?: string[] }) =>
    cachedWeebLookup(manga.title, manga.altTitles ?? []),
);

const cachedMdFeed = unstable_cache(
  async (ref: string): Promise<{ data: Chapter[]; total: number }> =>
    fetchFeed(ref),
  ["resolve-md-feed"],
  { revalidate: 600 },
);

export const getMdFeed = cache((ref: string) => cachedMdFeed(ref));

const cachedMdAggregate = unstable_cache(
  async (ref: string): Promise<Awaited<ReturnType<typeof fetchAggregate>>> =>
    fetchAggregate(ref),
  ["resolve-md-aggregate"],
  { revalidate: SOURCE_REVALIDATE },
);

export const getMdAggregate = cache((ref: string) =>
  cachedMdAggregate(ref),
);

export async function mdRefForManga(manga: {
  title: string;
  altTitles?: string[];
}): Promise<string | null> {
  try {
    const match = await matchToMangaDex({
      title: manga.title,
      altTitles: manga.altTitles,
    });
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function mdRefForCatalogId(mangaId: string): Promise<string | null> {
  const { source, ref } = parseMangaId(mangaId);
  if (source === "mangadex") return ref;
  try {
    const manga = await fetchCatalogManga(mangaId, { withStats: false });
    return mdRefForManga(manga);
  } catch {
    return null;
  }
}

export async function resolveFirstChapter(
  mangaId: string,
): Promise<string | null> {
  try {
    const atsu = await getAtsuMatch(mangaId);
    if (atsu) {
      const scanlator = primaryScanlator(
        atsu.match.manga.scanlators,
        atsu.chapters,
      );
      const ordered = chaptersOfScanlator(atsu.chapters, scanlator?.id ?? "");
      const first = ordered[0] ?? atsu.chapters[0];
      if (first) return first.id;
    }
    const manga = await fetchCatalogManga(mangaId, { withStats: false });
    const weebFirst = await fetchWeebFirstChapter([
      manga.title,
      ...(manga.altTitles ?? []),
    ]);
    if (weebFirst) return weebFirst;
    const katanaFirst = await fetchKatanaFirstChapter(manga.title);
    if (katanaFirst) return katanaFirst;
    const mdRef = await mdRefForManga(manga);
    if (!mdRef) return null;
    const feed = await fetchFeed(mdRef);
    const first = feed.data.find((chapter) => !chapter.externalUrl);
    if (first) return first.id;
    return null;
  } catch {
    return null;
  }
}
