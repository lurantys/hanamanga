import { NextResponse } from "next/server";
import { bannerForManga } from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Truncate: the title feeds the Data Cache key, so unbounded input
  // would mint unbounded cache entries.
  const title = (searchParams.get("title")?.trim() ?? "").slice(0, 120);
  const anilistId = searchParams.get("anilistId")?.trim() || undefined;
  if (!title && !anilistId) return NextResponse.json({ bannerUrl: null });
  try {
    const bannerUrl = await bannerForManga({ title, anilistId });
    return NextResponse.json(
      { bannerUrl },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ bannerUrl: null });
  }
}
