import { notFound, redirect } from "next/navigation";
import {
  chapterPageUrl,
  fetchChapterReader,
  MangaDexError,
  UPLOADS,
  type Chapter,
} from "@/lib/mangadex";
import { buildAtsuReader } from "@/lib/atsu";
import { fetchCatalogManga } from "@/lib/catalog";
import { getAtsuMatch, getKatanaLookup, getMdFeed, getWeebLookup } from "@/lib/read";
import { parseMangaId } from "@/lib/source";
import { fetchKatanaPages, resolveLegacyChapter } from "@/lib/mangakatana";
import { fetchWeebPages, resolveWeebLegacyChapter } from "@/lib/weebcentral";

export type ReaderPage = {
  id: string;
  image: string;
  width?: number;
  height?: number;
};

export type ReaderChapter = {
  id: string;
  label: string;
};

export type ReaderProps = {
  mangaId: string;
  mangaTitle: string;
  mangaHref: string;
  chapterLabel: string;
  chapterNumber?: number | null;
  currentChapterId: string;
  chapters: ReaderChapter[];
  pages: ReaderPage[];
  prevHref?: string | null;
  nextHref?: string | null;
};

function mdChapterLabel(chapter: Chapter): string {
  if (chapter.chapter && chapter.title) return `${chapter.chapter}: ${chapter.title}`;
  if (chapter.chapter) return `Chapter ${chapter.chapter}`;
  if (chapter.title) return chapter.title;
  return "Chapter";
}

function mdChapterNumber(chapter: Chapter): number | null {
  if (chapter.chapter === null || chapter.chapter === undefined) return null;
  const parsed = Number(chapter.chapter);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolve everything the reader needs for a chapter, trying Atsumaru, then
 * MangaKatana, then MangaDex. Shared by the reader page and the preload route so
 * chapter navigation stays consistent across both code paths.
 */
export async function buildReaderProps(
  mangaId: string,
  chapterId: string,
): Promise<ReaderProps> {
  const { source, ref } = parseMangaId(mangaId);

  let manga;
  let atsuMatchData: Awaited<ReturnType<typeof getAtsuMatch>>;
  try {
    [manga, atsuMatchData] = await Promise.all([
      fetchCatalogManga(mangaId, { withStats: false }),
      getAtsuMatch(mangaId),
    ]);
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
  }
  const atsuMatch = atsuMatchData?.match ?? null;
  const atsuChapters = atsuMatchData?.chapters ?? [];

  if (atsuMatch) {
    try {
      const atsuReader = await buildAtsuReader({
        mangaId,
        atsuMangaId: atsuMatch.manga.id,
        atsuChapters,
        chapterId,
      });
       if (atsuReader && atsuReader.pages.length > 0) {
         return {
          mangaId,
          mangaTitle: manga.title,
          mangaHref: `/manga/${mangaId}`,
          chapterLabel: atsuReader.chapterLabel,
          chapterNumber: atsuReader.chapterNumber,
          currentChapterId: chapterId,
          chapters: atsuReader.chapters,
          pages: atsuReader.pages,
          prevHref: atsuReader.prevHref,
          nextHref: atsuReader.nextHref,
        };
      }
    } catch {
      // fall through to other sources
    }
  }

  if (source === "atsu") notFound();

  let weebReader: {
    chapterLabel: string;
    chapterNumber: number | null;
    chapters: ReaderChapter[];
    pages: ReaderPage[];
    prevHref: string | null;
    nextHref: string | null;
  } | null = null;

  try {
    const lookup = await getWeebLookup(manga);
    if (lookup.manga && lookup.chapters.length > 0) {
      let current =
        lookup.chapters.find((chapter) => chapter.id === chapterId) ?? null;
      if (!current) {
        current = await resolveWeebLegacyChapter(
          lookup.chapters,
          ref,
          chapterId,
        );
      }
      if (current) {
        const pages = await fetchWeebPages(current.url).catch(
          () => [] as string[],
        );
        if (pages.length > 0) {
          const index = lookup.chapters.indexOf(current);
          const prev = index > 0 ? lookup.chapters[index - 1] : null;
          const next =
            index < lookup.chapters.length - 1
              ? lookup.chapters[index + 1]
              : null;
          weebReader = {
            chapterLabel: current.label,
            chapterNumber: current.number,
            chapters: lookup.chapters.map((chapter) => ({
              id: chapter.id,
              label: chapter.label,
            })),
            pages: pages.map((image) => ({ id: image, image })),
            prevHref: prev ? `/read/${mangaId}/${prev.id}` : null,
            nextHref: next ? `/read/${mangaId}/${next.id}` : null,
          };
        }
      }
    }
  } catch {
    // WeebCentral unavailable — fall through to MangaKatana.
  }

  if (weebReader) {
    return {
      mangaId,
      mangaTitle: manga.title,
      mangaHref: `/manga/${mangaId}`,
      chapterLabel: weebReader.chapterLabel,
      chapterNumber: weebReader.chapterNumber,
      currentChapterId: chapterId,
      chapters: weebReader.chapters,
      pages: weebReader.pages,
      prevHref: weebReader.prevHref,
      nextHref: weebReader.nextHref,
    };
  }

  let katanaReader: {
    chapterLabel: string;
    chapterNumber: number | null;
    chapters: ReaderChapter[];
    pages: ReaderPage[];
    prevHref: string | null;
    nextHref: string | null;
  } | null = null;

  try {
    const lookup = await getKatanaLookup(manga.title);
    if (lookup.manga && lookup.chapters.length > 0) {
      let current =
        lookup.chapters.find((chapter) => chapter.id === chapterId) ?? null;
      if (!current) {
        current = await resolveLegacyChapter(
          lookup.chapters,
          mangaId,
          chapterId,
        );
      }
      if (current) {
        const pages = await fetchKatanaPages(lookup.manga, current).catch(
          () => [] as string[],
        );
        if (pages.length > 0) {
          const index = lookup.chapters.indexOf(current);
          const prev = index > 0 ? lookup.chapters[index - 1] : null;
          const next =
            index < lookup.chapters.length - 1
              ? lookup.chapters[index + 1]
              : null;
          katanaReader = {
            chapterLabel: current.label,
            chapterNumber: current.number,
            chapters: lookup.chapters.map((chapter) => ({
              id: chapter.id,
              label: chapter.label,
            })),
            pages: pages.map((image) => ({ id: image, image })),
            prevHref: prev ? `/read/${mangaId}/${prev.id}` : null,
            nextHref: next ? `/read/${mangaId}/${next.id}` : null,
          };
        }
      }
    }
  } catch {
    // MangaKatana unavailable — fall through to MangaDex.
  }

  if (katanaReader) {
    return {
      mangaId,
      mangaTitle: manga.title,
      mangaHref: `/manga/${mangaId}`,
      chapterLabel: katanaReader.chapterLabel,
      chapterNumber: katanaReader.chapterNumber,
      currentChapterId: chapterId,
      chapters: katanaReader.chapters,
      pages: katanaReader.pages,
      prevHref: katanaReader.prevHref,
      nextHref: katanaReader.nextHref,
    };
  }

  let feed;
  let reader;
  try {
    [feed, reader] = await Promise.all([
      getMdFeed(ref),
      fetchChapterReader(chapterId),
    ]);
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
  }

  const currentIndex = feed.data.findIndex((item) => item.id === chapterId);
  if (currentIndex === -1) notFound();
  const mdChapter = feed.data[currentIndex];

  if (mdChapter.externalUrl) {
    redirect(mdChapter.externalUrl);
  }

  const prev = currentIndex > 0 ? feed.data[currentIndex - 1] : null;
  const next =
    currentIndex < feed.data.length - 1 ? feed.data[currentIndex + 1] : null;

  return {
    mangaId,
    mangaTitle: manga.title,
    mangaHref: `/manga/${mangaId}`,
    chapterLabel: mdChapterLabel(mdChapter),
    chapterNumber: mdChapterNumber(mdChapter),
    currentChapterId: chapterId,
    chapters: feed.data.map((item) => ({
      id: item.id,
      label: mdChapterLabel(item),
    })),
    pages: reader.pages.map((file) => ({
      id: file,
      image: chapterPageUrl(UPLOADS, reader.hash, file),
    })),
    prevHref: prev ? `/read/${mangaId}/${prev.id}` : null,
    nextHref: next ? `/read/${mangaId}/${next.id}` : null,
  };
}
