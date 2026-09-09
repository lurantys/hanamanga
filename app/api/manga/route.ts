import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchMangaList, type Manga } from "@/lib/mangadex";
import { atsuToManga, enhanceWithAniList } from "@/lib/catalog";
import { fetchAtsuManga } from "@/lib/atsu";
import { splitMangaIds } from "@/lib/source";
import { fetchAniListByIds } from "@/lib/anilist";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Per-ref cache for Atsumaru lookups only. The old combo-key cache took the
// whole `ids` array as its key, so every user's unique library/continue set
// wrote a Data Cache entry that never hit again — pure ISR-write burn.
// MangaDex (batched, one upstream call) and AniList (single batched GraphQL
// query) are fetched uncached per request; only the per-ref Atsu lookups,
// which fan out 1:1 and are shared across users, keep a bounded per-manga
// cache entry.
const cachedAtsuOne = unstable_cache(
  async (ref: string) => {
    try {
      return atsuToManga(await fetchAtsuManga(ref));
    } catch {
      return null;
    }
  },
  ["api-manga-atsu-one"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const withBanners = searchParams.get("banners") === "1";
  if (!ids.length || ids.length > 100) {
    return NextResponse.json(
      { data: [] },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  }
  try {
    const { mangadex, atsu, al } = splitMangaIds([...new Set(ids)]);
    // Each source resolves independently: when AniList is down the MangaDex
    // + Atsu results must still return (hero/continue/library enrichment),
    // instead of the whole batch 502ing on one provider.
    const [mdData, atsuData, alData] = await Promise.all([
      (async () => {
        try {
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
        } catch {
          return [] as Manga[];
        }
      })(),
      Promise.all(atsu.map((ref) => cachedAtsuOne(ref))),
      fetchAniListByIds(al).catch(() => [] as Manga[]),
    ]);
    const data = [
      ...mdData,
      ...alData,
      ...atsuData.filter((manga): manga is Manga => manga !== null),
    ];
    if (withBanners) {
      await Promise.all(
        data.map(async (manga, index) => {
          const enhanced = await enhanceWithAniList(manga);
          data[index] = {
            ...manga,
            bannerUrl: enhanced.bannerUrl,
            coverUrl: enhanced.coverUrl,
            description: enhanced.description ?? manga.description,
            rating: enhanced.rating ?? manga.rating,
          };
        }),
      );
    }
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
