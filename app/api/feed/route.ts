import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchFeed } from "@/lib/mangadex";
import { mdRefForCatalogId } from "@/lib/read";

export const dynamic = "force-dynamic";

const cachedRefForCatalogId = unstable_cache(
  async (mangaId: string) => mdRefForCatalogId(mangaId),
  ["api-feed-ref"],
  { revalidate: 3600 },
);

const cachedFeedFor = unstable_cache(
  async (ref: string, limit: number) => {
    const { data } = await fetchFeed(ref, limit, { publishAt: "desc" });
    return data;
  },
  ["api-feed"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mangaIds = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const limit = Math.min(Number(searchParams.get("limit")) || 3, 5);

  try {
    if (mangaIds.length) {
      const map: Record<string, unknown[]> = {};
      await Promise.all(
        mangaIds.map(async (mangaId) => {
          const ref = await cachedRefForCatalogId(mangaId);
          if (!ref) return;
          map[mangaId] = await cachedFeedFor(ref, limit);
        }),
      );
      return NextResponse.json(
        { data: map },
        {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    }

    const mangaId = searchParams.get("mangaId");
    if (!mangaId) return NextResponse.json({ data: [] });
    const ref = await cachedRefForCatalogId(mangaId);
    if (!ref) return NextResponse.json({ data: [] });
    const data = await cachedFeedFor(ref, limit);
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [] });
  }
}
