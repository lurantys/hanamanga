import { cache } from "react";
import { fetchFeed, fetchMangaById, fetchTrending, type Manga } from "./mangadex";
import {
  chaptersOfScanlator,
  findAtsuManga,
  primaryScanlator,
} from "./atsu";

export const getTrending = cache(() => fetchTrending(18));

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
      const chapters = atsuMatch.manga.chapters;
      const scanlator = primaryScanlator(atsuMatch.manga.scanlators, chapters);
      const ordered = chaptersOfScanlator(chapters, scanlator?.id ?? "");
      const first = ordered[0] ?? chapters[0];
      if (first) return first.id;
    }
    const feed = await fetchFeed(mangaId);
    const first = feed.data.find((chapter) => !chapter.externalUrl);
    if (first) return first.id;
  } catch {
    return null;
  }
  return null;
}
