import { NextResponse } from "next/server";
import { fetchBrowseCatalog } from "@/lib/catalog";
import {
  isMinScoreKey,
  isOriginKey,
  isRatingKey,
  isSortKey,
  isStatusKey,
  type SortKey,
} from "@/lib/genres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const sortParam = sp.get("sort") ?? "popular";
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";
  const genresParam = sp.get("genres")?.trim() || undefined;
  const statusParam = sp.get("status")?.trim() || undefined;
  const status = isStatusKey(statusParam ?? "") ? (statusParam ?? "") : "";
  const ratingParam = sp.get("rating")?.trim() || undefined;
  const rating = isRatingKey(ratingParam ?? "") ? (ratingParam ?? "") : "";
  const originParam = sp.get("origin")?.trim() || undefined;
  const origin = isOriginKey(originParam ?? "") ? (originParam ?? "") : "";
  const yearFrom = sp.get("yearFrom")?.trim() || "";
  const yearTo = sp.get("yearTo")?.trim() || "";
  const minScoreParam = sp.get("minScore")?.trim() || "";
  const minScore = isMinScoreKey(minScoreParam ?? "") ? (minScoreParam ?? "") : "";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  try {
    const { data, total } = await fetchBrowseCatalog({
      sort,
      genres: (genresParam ?? "").split(",").map((genre) => genre.trim()).filter(Boolean),
      status: status || undefined,
      rating: rating || undefined,
      origin: origin || undefined,
      yearFrom: /^\d{4}$/.test(yearFrom) ? Number(yearFrom) : undefined,
      yearTo: /^\d{4}$/.test(yearTo) ? Number(yearTo) : undefined,
      minScore: minScore ? Number(minScore) : undefined,
      page,
    });
    return NextResponse.json(
      { data, total, page },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { data: [], total: 0, error: "unavailable" },
      { status: 502 },
    );
  }
}
