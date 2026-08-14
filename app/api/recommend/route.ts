import { NextResponse } from "next/server";
import { fetchMangaList, getTagId, type Manga } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

const TAG_FETCH_LIMIT = 24;

function parseWeightedTags(raw: string): { name: string; weight: number }[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, weightRaw] = part.split(":");
      const weight = Number(weightRaw);
      return { name, weight: Number.isFinite(weight) ? weight : 1 };
    });
}

function popularityFactor(follows?: number): number {
  return Math.log10((follows ?? 0) + 10);
}

function recommendationScore(
  manga: Manga,
  weightByName: Map<string, number>,
  totalWeight: number,
): number {
  let overlap = 0;
  for (const genre of manga.genres ?? []) {
    overlap += weightByName.get(genre.toLowerCase()) ?? 0;
  }
  const overlapRatio = Math.min(1, overlap / Math.max(1, totalWeight));
  return (0.05 + 0.95 * overlapRatio) * popularityFactor(manga.follows);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weighted = parseWeightedTags(searchParams.get("tags") ?? "");
  const exclude = new Set(
    (searchParams.get("exclude") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const limit = Math.min(Number(searchParams.get("limit")) || 18, 40);

  if (!weighted.length) return NextResponse.json({ data: [] });

  const weightByName = new Map<string, number>();
  const totalWeight = weighted.reduce(
    (sum, tag) => sum + tag.weight,
    0,
  );
  for (const tag of weighted) {
    weightByName.set(tag.name.toLowerCase(), tag.weight);
  }

  const tagIds = (
    await Promise.all(weighted.map((tag) => getTagId(tag.name)))
  ).filter((id): id is string => Boolean(id));

  let candidates: Manga[] = [];
  try {
    const pools = await Promise.all([
      ...tagIds.slice(0, 4).map((tagId) =>
        fetchMangaList({
          limit: TAG_FETCH_LIMIT,
          order: { followedCount: "desc" },
          includedTags: [tagId],
        }).then((result) => result.data),
      ),
      fetchMangaList({
        limit: TAG_FETCH_LIMIT,
        order: { followedCount: "desc" },
      }).then((result) => result.data),
    ]);
    const byId = new Map<string, Manga>();
    for (const pool of pools) {
      for (const manga of pool) byId.set(manga.id, manga);
    }
    candidates = [...byId.values()];
  } catch {
    try {
      const result = await fetchMangaList({
        limit: Math.min(limit + exclude.size + 12, 100),
        order: { followedCount: "desc" },
      });
      candidates = result.data;
    } catch {
      return NextResponse.json(
        { data: [], error: "unavailable" },
        { status: 502 },
      );
    }
  }

  const scored = candidates
    .filter((manga) => !exclude.has(manga.id))
    .map((manga) => ({
      manga,
      score: recommendationScore(manga, weightByName, totalWeight),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ manga }) => manga);

  return NextResponse.json(
    { data: scored },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}