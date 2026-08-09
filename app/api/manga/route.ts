import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchMangaList, type Manga } from "@/lib/mangadex";
import { atsuToManga } from "@/lib/catalog";
import { fetchAtsuManga } from "@/lib/atsu";
import { splitMangaIds } from "@/lib/source";
import { bannerForManga } from "@/lib/banner";

export const dynamic = "force-dynamic";

const cachedMangaByIds = unstable_cache(
  async (ids: string[]) => (await fetchMangaList({ ids })).data,
  ["api-manga-ids"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const withBanners = searchParams.get("banners") === "1";
  if (!ids.length) return NextResponse.json({ data: [] });
  try {
    const { mangadex, atsu } = splitMangaIds(ids);
    const [mdData, atsuData] = await Promise.all([
      mangadex.length ? cachedMangaByIds(mangadex) : Promise.resolve([]),
      Promise.all(
        atsu.map(async (ref) => {
          try {
            return atsuToManga(await fetchAtsuManga(ref));
          } catch {
            return null;
          }
        }),
      ),
    ]);
    const data = [...mdData, ...atsuData.filter((manga): manga is Manga => manga !== null)];
    if (withBanners) {
      await Promise.all(
        data.map(async (manga) => {
          manga.bannerUrl = await bannerForManga({
            title: manga.title,
            anilistId: manga.links?.al,
          });
        }),
      );
    }
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [], error: "unavailable" }, { status: 502 });
  }
}
