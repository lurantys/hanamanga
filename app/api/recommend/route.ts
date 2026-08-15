import { NextResponse } from "next/server";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList, getTagId, type Manga } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

const POOL_FETCH_LIMIT = 24;

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

function hashSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function jitter(id: string, seed: number): number {
  const combined = (hashSeed(id) ^ (seed * 2654435761)) >>> 0;
  return ((combined % 1000) / 1000) * 0.08 - 0.04;
}

function recommendationScore(
  manga: Manga,
  weightByName: Map<string, number>,
  totalWeight: number,
  seed: number,
): number {
  let overlap = 0;
  for (const genre of manga.genres ?? []) {
    overlap += weightByName.get(genre.toLowerCase()) ?? 0;
  }
  const overlapRatio = Math.min(1, overlap / Math.max(1, totalWeight));
  const base = (0.05 + 0.95 * overlapRatio) * popularityFactor(manga.follows);
  return base * (1 + jitter(manga.id, seed));
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
  const seed = Number(searchParams.get("seed")) || 0;

  if (!weighted.length) return NextResponse.json({ data: [] });

  const weightByName = new Map<string, number>();
  const totalWeight = weighted.reduce(
    (sum, tag) => sum + tag.weight,
    0,
  );
  for (const tag of weighted) {
    weightByName.set(tag.name.toLowerCase(), tag.weight);
  }

  const offsetBase = (seed % 12) * POOL_FETCH_LIMIT;
  const pools: Manga[][] = [];
  for (const tag of weighted.slice(0, 4)) {
    try {
      const result = await fetchAniListList({
        limit: POOL_FETCH_LIMIT,
        offset: offsetBase,
        genre: tag.name,
        sort: "popular",
      });
      pools.push(result.data);
    } catch {
      try {
        const tagId = await getTagId(tag.name);
        const result = await fetchMangaList({
          limit: POOL_FETCH_LIMIT,
          offset: offsetBase,
          order: { followedCount: "desc" },
          includedTags: tagId ? [tagId] : undefined,
        });
        pools.push(result.data);
      } catch {
        // skip genres neither source can filter on
      }
    }
  }
  try {
    const general = await fetchAniListList({
      limit: POOL_FETCH_LIMIT,
      offset: offsetBase + 40,
      sort: "popular",
    });
    pools.push(general.data);
  } catch {
    try {
      const general = await fetchMangaList({
        limit: POOL_FETCH_LIMIT,
        offset: offsetBase + 40,
        order: { followedCount: "desc" },
      });
      pools.push(general.data);
    } catch {
      // fall through to the pools already collected
    }
  }

  let candidates: Manga[] = [];
  if (pools.length) {
    const byId = new Map<string, Manga>();
    for (const pool of pools) {
      for (const manga of pool) byId.set(manga.id, manga);
    }
    candidates = [...byId.values()];
  } else {
    try {
      const result = await fetchAniListList({
        limit: Math.min(limit + exclude.size + 12, 100),
        sort: "popular",
      });
      candidates = result.data;
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
  }

  const scored = candidates
    .filter((manga) => !exclude.has(manga.id))
    .map((manga) => ({
      manga,
      score: recommendationScore(manga, weightByName, totalWeight, seed),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ manga }) => manga);

  return NextResponse.json(
    { data: scored },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}