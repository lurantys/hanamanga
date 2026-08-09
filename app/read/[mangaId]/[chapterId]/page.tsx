import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/Reader";
import {
  chapterPageUrl,
  fetchChapterReader,
  fetchFeed,
  truncate,
  MangaDexError,
  UPLOADS,
  type Chapter,
} from "@/lib/mangadex";
import {
  buildAtsuReader,
  fetchAtsuChapters,
  fetchAtsuManga,
  findAtsuManga,
  type AtsuReader,
} from "@/lib/atsu";
import { fetchCatalogManga } from "@/lib/catalog";
import { parseMangaId } from "@/lib/source";
import { fetchKatanaReader } from "@/lib/mangakatana";

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
    const manga = await fetchCatalogManga(mangaId, { withStats: false });
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
  const { source, ref } = parseMangaId(mangaId);

  let manga;
  try {
    manga = await fetchCatalogManga(mangaId, { withStats: false });
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
  }

  let atsuReader: AtsuReader | null = null;

  if (source === "atsu") {
    try {
      const atsuManga = await fetchAtsuManga(ref);
      const atsuChapters = await fetchAtsuChapters(ref).catch(
        () => atsuManga.chapters,
      );
      atsuReader = await buildAtsuReader({
        mangaId,
        atsuMangaId: ref,
        atsuChapters,
        chapterId,
      });
    } catch {
      atsuReader = null;
    }
    if (!atsuReader) notFound();
  } else {
    let atsuMatch = null;
    try {
      atsuMatch = await findAtsuManga({ title: manga.title, links: manga.links });
    } catch {
      atsuMatch = null;
    }

    if (atsuMatch) {
      try {
        const atsuChapters = await fetchAtsuChapters(atsuMatch.manga.id);
        atsuReader = await buildAtsuReader({
          mangaId,
          atsuMangaId: atsuMatch.manga.id,
          atsuChapters,
          chapterId,
        });
      } catch {
        atsuReader = null;
      }
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

  let katanaReader: Awaited<ReturnType<typeof fetchKatanaReader>> = null;
  try {
    katanaReader = await fetchKatanaReader({
      mangaTitle: manga.title,
      chapterId,
      mangaId,
    });
  } catch {
    // MangaKatana unavailable — fall through to MangaDex.
  }

  if (katanaReader) {
    return (
      <Reader
        mangaId={mangaId}
        mangaTitle={manga.title}
        mangaHref={`/manga/${mangaId}`}
        chapterLabel={katanaReader.chapterLabel}
        chapterNumber={katanaReader.chapterNumber}
        currentChapterId={chapterId}
        chapters={katanaReader.chapters}
        pages={katanaReader.pages}
        prevHref={katanaReader.prevHref}
        nextHref={katanaReader.nextHref}
      />
    );
  }

  // Final fallback: MangaDex.
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
