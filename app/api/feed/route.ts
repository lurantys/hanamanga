import { NextResponse } from "next/server";
import { fetchFeed } from "@/lib/mangadex";
import { mdRefForCatalogId } from "@/lib/read";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mangaId = searchParams.get("mangaId");
  if (!mangaId) return NextResponse.json({ data: [] });
  const limit = Math.min(Number(searchParams.get("limit")) || 1, 5);

  try {
    const ref = await mdRefForCatalogId(mangaId);
    if (!ref) return NextResponse.json({ data: [] });
    const { data } = await fetchFeed(ref, limit, { publishAt: "desc" });
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [] });
  }
}
