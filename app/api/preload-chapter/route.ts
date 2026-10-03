import { NextResponse } from "next/server";
import { buildReaderProps } from "@/lib/reader-data";

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
    // Catalog IDs do not identify the chapter provider. Resolve the same
    // source as the reader and warm its props cache for the next navigation.
    const data = await buildReaderProps(mangaId, chapterId);
    return NextResponse.json(
      { pages: data.pages.slice(0, 3).map((page) => page.image) },
      { headers },
    );
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
