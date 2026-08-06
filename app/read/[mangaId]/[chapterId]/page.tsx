import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/Reader";
import {
  chapterPageUrl,
  fetchChapterReader,
  fetchFeed,
  fetchMangaById,
  truncate,
  MangaDexError,
  UPLOADS,
  type Chapter,
} from "@/lib/mangadex";
import {
  atsuChapterLabel,
  atsuPageUrl,
  fetchAtsuChapter,
  fetchAtsuChapters,
  findAtsuManga,
} from "@/lib/atsu";

type ReadPageProps = {
  params: Promise<{ mangaId: string; chapterId: string }>;
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

export async function generateMetadata({
  params,
}: ReadPageProps): Promise<Metadata> {
  const { mangaId } = await params;
  try {
    const manga = await fetchMangaById(mangaId, { withStats: false });
    return {
      title: `${manga.title} — Hana`,
      description: manga.description ? truncate(manga.description, 160) : undefined,
    };
  } catch {
    return { title: "Reader — Hana" };
  }
}

export default async function ReadPage({ params }: ReadPageProps) {
  const { mangaId, chapterId } = await params;

  let manga;
  try {
    manga = await fetchMangaById(mangaId, { withStats: false });
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
  }

  let atsuMatch = null;
  try {
    atsuMatch = await findAtsuManga({ title: manga.title, links: manga.links });
  } catch {
    atsuMatch = null;
  }

  let atsuReader:
    | {
        chapterLabel: string;
        chapterNumber: number | null;
        chapters: { id: string; label: string }[];
        pages: {
          id: string;
          image: string;
          width?: number;
          height?: number;
        }[];
        prevHref: string | null;
        nextHref: string | null;
      }
    | null = null;

  if (atsuMatch) {
    try {
      const atsuChapters = await fetchAtsuChapters(atsuMatch.manga.id);
      const currentAtsuChapter = atsuChapters.find((item) => item.id === chapterId);
      if (currentAtsuChapter) {
        const chapter = await fetchAtsuChapter(atsuMatch.manga.id, chapterId);
        const sorted = [...atsuChapters].sort((a, b) => a.index - b.index);
        const groupChapters = sorted.filter(
          (item) => item.scanlationMangaId === currentAtsuChapter.scanlationMangaId,
        );
        const currentIndex = groupChapters.findIndex(
          (item) => item.id === chapterId,
        );
        const prev = currentIndex > 0 ? groupChapters[currentIndex - 1] : null;
        const next =
          currentIndex >= 0 && currentIndex < groupChapters.length - 1
            ? groupChapters[currentIndex + 1]
            : null;

        atsuReader = {
          chapterLabel: chapter.title
            ? chapter.title
            : atsuChapterLabel({ title: chapter.title, number: null }),
          chapterNumber: currentAtsuChapter.number ?? null,
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
          prevHref: prev ? `/read/${mangaId}/${prev.id}` : null,
          nextHref: next ? `/read/${mangaId}/${next.id}` : null,
        };
      }
    } catch {
      // Atsumaru source unavailable — fall through to MangaDex chapters.
    }
  }

  if (atsuReader) {
    return (
      <Reader
        mangaId={mangaId}
        mangaTitle={manga.title}
        mangaHref={`/manga/${mangaId}`}
        chapterLabel={atsuReader.chapterLabel}
        chapterNumber={atsuReader.chapterNumber}
        currentChapterId={chapterId}
        chapters={atsuReader.chapters}
        pages={atsuReader.pages}
        prevHref={atsuReader.prevHref}
        nextHref={atsuReader.nextHref}
      />
    );
  }

  let feed;
  let reader;
  try {
    [feed, reader] = await Promise.all([
      fetchFeed(mangaId),
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

  return (
    <Reader
      mangaId={mangaId}
      mangaTitle={manga.title}
      mangaHref={`/manga/${mangaId}`}
      chapterLabel={mdChapterLabel(mdChapter)}
      chapterNumber={mdChapterNumber(mdChapter)}
      currentChapterId={chapterId}
      chapters={feed.data.map((item) => ({
        id: item.id,
        label: mdChapterLabel(item),
      }))}
      pages={reader.pages.map((file) => ({
        id: file,
        image: chapterPageUrl(UPLOADS, reader.hash, file),
      }))}
      prevHref={prev ? `/read/${mangaId}/${prev.id}` : null}
      nextHref={next ? `/read/${mangaId}/${next.id}` : null}
    />
  );
}
