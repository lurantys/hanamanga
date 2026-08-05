import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/Reader";
import {
  chapterPageUrl,
  fetchChapterById,
  fetchChapterReader,
  fetchFeed,
  fetchMangaById,
  truncate,
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
  const { mangaId, chapterId } = await params;
  try {
    const manga = await fetchMangaById(mangaId);
    let subtitle: string | null = null;

    try {
      const match = await findAtsuManga({ title: manga.title, links: manga.links });
      if (match) {
        const chapter = await fetchAtsuChapter(match.manga.id, chapterId);
        if (chapter?.title) subtitle = chapter.title;
      }
    } catch {
      subtitle = null;
    }

    if (!subtitle) {
      try {
        const chapter = await fetchChapterById(chapterId);
        if (chapter?.title) subtitle = chapter.title;
      } catch {
        subtitle = null;
      }
    }

    return {
      title: subtitle
        ? `${manga.title} · ${subtitle} — Hana`
        : `${manga.title} — Hana`,
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
    manga = await fetchMangaById(mangaId);
  } catch {
    notFound();
  }

  let atsuMatch = null;
  try {
    atsuMatch = await findAtsuManga({ title: manga.title, links: manga.links });
  } catch {
    atsuMatch = null;
  }

  if (atsuMatch) {
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

      return (
        <Reader
          mangaId={mangaId}
          mangaTitle={manga.title}
          mangaHref={`/manga/${mangaId}`}
          chapterLabel={
            chapter.title
              ? chapter.title
              : atsuChapterLabel({ title: chapter.title, number: null })
          }
          chapterNumber={currentAtsuChapter.number ?? null}
          currentChapterId={chapterId}
          chapters={groupChapters.map((item) => ({
            id: item.id,
            label: atsuChapterLabel(item),
          }))}
          pages={chapter.pages.map((page) => ({
            id: page.id,
            image: atsuPageUrl(page),
            width: page.width,
            height: page.height,
          }))}
          prevHref={prev ? `/read/${mangaId}/${prev.id}` : null}
          nextHref={next ? `/read/${mangaId}/${next.id}` : null}
        />
      );
    }
  }

  let feed;
  try {
    feed = await fetchFeed(mangaId);
  } catch {
    notFound();
  }

  const currentIndex = feed.data.findIndex((item) => item.id === chapterId);
  if (currentIndex === -1) notFound();
  const mdChapter = feed.data[currentIndex];

  if (mdChapter.externalUrl) {
    redirect(mdChapter.externalUrl);
  }

  const reader = await fetchChapterReader(chapterId);
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
