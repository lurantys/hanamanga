import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchMangaList, type Manga } from "@/lib/mangadex";
import { atsuToManga, enhanceWithAniList } from "@/lib/catalog";
import { fetchAtsuManga } from "@/lib/atsu";
import { splitMangaIds } from "@/lib/source";
import { fetchAniListByIds } from "@/lib/anilist";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cachedProviderFetch = unstable_cache(
  async (ids: string[], withBanners: boolean) => {
    const { mangadex, atsu, al } = splitMangaIds(ids);
    const [mdData, atsuData, alData] = await Promise.all([
      (async () => {
        const results: Manga[] = [];
        for (let i = 0; i < mangadex.length; i += 100) {
          results.push(
            ...(await fetchMangaList({
              ids: mangadex.slice(i, i + 100),
              limit: 100,
            })).data,
          );
        }
        return results;
      })(),
      Promise.all(
        atsu.map(async (ref) => {
          try {
            return atsuToManga(await fetchAtsuManga(ref));
          } catch {
            return null;
          }
        }),
      ),
      fetchAniListByIds(al).catch(() => [] as Manga[]),
    ]);
    const data = [
      ...mdData,
      ...alData,
      ...atsuData.filter((manga): manga is Manga => manga !== null),
    ];
    if (withBanners) {
      await Promise.all(
        data.map(async (manga) => {
          const enhanced = await enhanceWithAniList(manga);
          manga.bannerUrl = enhanced.bannerUrl;
          manga.coverUrl = enhanced.coverUrl;
          manga.description = enhanced.description ?? manga.description;
        }),
      );
    }
    return data;
  },
  ["api-manga"],
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
    const data = await cachedProviderFetch(ids, withBanners);
    const foundAl = new Set(data.filter((m) => m.id.startsWith("al:")).map((m) => m.id));
    const missingAl = splitMangaIds(ids).al.filter(
      (ref) => !foundAl.has(`al:${ref}`),
    );
    if (missingAl.length) {
      const supabase = await createClient();
      const { data: rows } = await supabase
        .from("hana_library")
        .select("manga_id, manga")
        .in("manga_id", missingAl.map((ref) => `al:${ref}`));
      for (const row of rows ?? []) {
        const blob = row.manga as Manga | null;
        if (!blob || typeof blob !== "object") continue;
        data.push({ ...blob, id: row.manga_id });
      }
    }
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [], error: "unavailable" }, { status: 502 });
  }
}
