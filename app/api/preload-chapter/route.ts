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
  try {
    const data = await buildReaderProps(mangaId, chapterId);
    return NextResponse.json(
      { pages: data.pages.slice(0, 3).map((page) => page.image) },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
