import { NextResponse } from "next/server";
import { fetchMangaList, type Manga } from "@/lib/mangadex";
import { atsuToManga } from "@/lib/catalog";
import { fetchAtsuManga } from "@/lib/atsu";
import { splitMangaIds } from "@/lib/source";
import { fetchAniListByIds } from "@/lib/anilist";
import { bannerForManga } from "@/lib/banner";
import { createClient } from "@/lib/supabase/server";

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
    const foundAl = new Set(alData.map((manga) => manga.id));
    const missingAl = al.filter((ref) => !foundAl.has(`al:${ref}`));
    if (missingAl.length) {
      const supabase = await createClient();
      const { data: rows } = await supabase
        .from("hana_library")
        .select("manga_id, manga")
        .in("manga_id", missingAl.map((ref) => `al:${ref}`));
      for (const row of rows ?? []) {
        const blob = row.manga as Manga | null;
        if (!blob || typeof blob !== "object") continue;
        alData.push({ ...blob, id: row.manga_id });
      }
    }
    const data = [
      ...mdData,
      ...alData,
      ...atsuData.filter((manga): manga is Manga => manga !== null),
    ];
    if (withBanners) {
      await Promise.all(
        data.map(async (manga) => {
          if (manga.bannerUrl) return;
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
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [], error: "unavailable" }, { status: 502 });
  }
}
