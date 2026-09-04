import { NextResponse } from "next/server";
import {
  chapterPageUrl,
  fetchChapterReader,
  UPLOADS,
} from "@/lib/mangadex";
import { buildReaderProps } from "@/lib/reader-data";
import { parseMangaId } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mangaId = searchParams.get("mangaId");
  const chapterId = searchParams.get("chapterId");
  if (!mangaId || !chapterId) {
    return NextResponse.json({ pages: [] });
  }
  const headers = {
    "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  };
  try {
    // Fast path: MangaDex chapters resolve with a single at-home call,
    // skipping the full multi-source reader waterfall below.
    if (parseMangaId(mangaId).source === "mangadex") {
      const reader = await fetchChapterReader(chapterId);
      return NextResponse.json(
        {
          pages: reader.pages
            .slice(0, 3)
            .map((file) =>
              chapterPageUrl(reader.baseUrl || UPLOADS, reader.hash, file),
            ),
        },
        { headers },
      );
    }
    const data = await buildReaderProps(mangaId, chapterId);
    return NextResponse.json(
      { pages: data.pages.slice(0, 3).map((page) => page.image) },
      { headers },
    );
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
