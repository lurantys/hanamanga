import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  fetchFeed,
  fetchMangaById,
  fetchMangaList,
  fetchTrending,
  type Manga,
  type MangaListResult,
} from "./mangadex";
import { tagIdFor } from "./genres";
import {
  chaptersOfScanlator,
  fetchAtsuChapters,
  findAtsuManga,
  primaryScanlator,
} from "./atsu";
import { fetchKatanaFirstChapter } from "./mangakatana";

const HOME_ROWS_REVALIDATE = 300;

const cachedTrending = unstable_cache(
  async (limit = 18): Promise<MangaListResult> => fetchTrending(limit),
  ["home-trending"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedPopular = unstable_cache(
  async (limit = 18): Promise<MangaListResult> =>
    fetchMangaList({ limit, order: { followedCount: "desc" } }),
  ["home-popular"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedTopRated = unstable_cache(
  async (limit = 18): Promise<MangaListResult> =>
    fetchMangaList({ limit, order: { rating: "desc" } }),
  ["home-top-rated"],
  { revalidate: HOME_ROWS_REVALIDATE },
);

const cachedByGenre = unstable_cache(
  async (genre: string, limit = 18): Promise<MangaListResult> => {
    const tagId = tagIdFor(genre);
    return fetchMangaList({
      limit,
      order: { followedCount: "desc" },
      includedTags: tagId ? [tagId] : undefined,
    });
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

export function pickHero(manga: Manga[]): Manga | null {
  if (!manga.length) return null;
  return manga[Math.floor(Math.random() * manga.length)] ?? null;
}

export async function resolveFirstChapter(
  mangaId: string,
): Promise<string | null> {
  try {
    const manga = await fetchMangaById(mangaId, { withStats: false });
    const atsuMatch = await findAtsuManga({
      title: manga.title,
      links: manga.links,
    });
    if (atsuMatch) {
      const chapters = await fetchAtsuChapters(atsuMatch.manga.id);
      const scanlator = primaryScanlator(atsuMatch.manga.scanlators, chapters);
      const ordered = chaptersOfScanlator(chapters, scanlator?.id ?? "");
      const first = ordered[0] ?? chapters[0];
      if (first) return first.id;
    }
    const katanaFirst = await fetchKatanaFirstChapter(manga.title);
    if (katanaFirst) return katanaFirst;
    const feed = await fetchFeed(mangaId);
    const first = feed.data.find((chapter) => !chapter.externalUrl);
    if (first) return first.id;
    return null;
  } catch {
    return null;
  }
  return null;
}
