import type { Metadata } from "next";
import { Reader } from "@/components/Reader";
import { buildReaderProps } from "@/lib/reader-data";
import { fetchCatalogManga } from "@/lib/catalog";
import { truncate } from "@/lib/mangadex";

type ReadPageProps = {
  params: Promise<{ mangaId: string; chapterId: string }>;
};

export const revalidate = 600;
export const generateStaticParams = async () => [];

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
  const props = await buildReaderProps(mangaId, chapterId);
  return (
    <Reader
      mangaId={props.mangaId}
      mangaTitle={props.mangaTitle}
      mangaCoverUrl={props.mangaCoverUrl}
      mangaHref={props.mangaHref}
      chapterLabel={props.chapterLabel}
      chapterNumber={props.chapterNumber}
      currentChapterId={props.currentChapterId}
      chapters={props.chapters}
      pages={props.pages}
      prevHref={props.prevHref}
      nextHref={props.nextHref}
    />
  );
}
