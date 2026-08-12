import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/Reader";
import {
  chapterPageUrl,
  fetchChapterReader,
  truncate,
  MangaDexError,
  UPLOADS,
  type Chapter,
} from "@/lib/mangadex";
import { buildAtsuReader, type AtsuReader } from "@/lib/atsu";
import { fetchCatalogManga } from "@/lib/catalog";
import { getAtsuMatch, getKatanaLookup, getMdFeed } from "@/lib/read";
import { parseMangaId } from "@/lib/source";
import {
  fetchKatanaPages,
  resolveLegacyChapter,
  type KatanaReader,
} from "@/lib/mangakatana";

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
  const atsuMatchData = await getAtsuMatch(mangaId);
  const atsuMatch = atsuMatchData?.match ?? null;
  const atsuChapters = atsuMatchData?.chapters ?? [];

  if (atsuMatch) {
    try {
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

  if (source === "atsu" && !atsuReader) notFound();

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

  let katanaReader: KatanaReader | null = null;
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
