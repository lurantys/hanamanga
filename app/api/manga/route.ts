import { NextResponse } from "next/server";
import { fetchMangaList } from "@/lib/mangadex";
import { bannerForTitle } from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const withBanners = searchParams.get("banners") === "1";
  if (!ids.length) return NextResponse.json({ data: [] });
  try {
    const { data } = await fetchMangaList({ ids });
    if (withBanners) {
      await Promise.all(
        data.map(async (manga) => {
          manga.bannerUrl = await bannerForTitle(manga.title);
        }),
      );
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [], error: "unavailable" }, { status: 502 });
  }
}
