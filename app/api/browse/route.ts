import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList } from "@/lib/mangadex";
import {
  isMinScoreKey,
  isOriginKey,
  isRatingKey,
  isSortKey,
  isStatusKey,
  RATING_VALUES,
  SORT_ORDER,
  tagIdFor,
  type SortKey,
} from "@/lib/genres";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

const cachedBrowse = unstable_cache(
  async (
    sort: SortKey,
    genres: string,
    status: string,
    rating: string,
    origin: string,
    yearFrom: string,
    yearTo: string,
    minScore: string,
    page: number,
  ) => {
    const offset = (page - 1) * PER_PAGE;
    const genreList = genres
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);
    try {
      try {
        return await fetchAniListList({
          limit: PER_PAGE,
          offset,
          sort,
          genres: genreList,
          status: status || undefined,
          rating: rating || undefined,
          origin: origin || undefined,
          yearFrom: yearFrom ? Number(yearFrom) : undefined,
          yearTo: yearTo ? Number(yearTo) : undefined,
          minScore: minScore ? Number(minScore) : undefined,
        });
      } catch {
        const tagIds = genreList.map(tagIdFor).filter((id): id is string => Boolean(id));
        return await fetchMangaList({
          limit: PER_PAGE,
          offset,
          order: SORT_ORDER[sort],
          includedTags: tagIds,
          status: status ? [status] : undefined,
          contentRating: rating ? RATING_VALUES[rating] : undefined,
          year: yearFrom && yearFrom === yearTo ? Number(yearFrom) : undefined,
        });
      }
    } catch {
      return { data: [], total: 0 };
    }
  },
  ["api-browse"],
  { revalidate: 300 },
);

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
    const { data, total } = await cachedBrowse(
      sort,
      genresParam ?? "",
      status,
      rating,
      origin,
      yearFrom,
      yearTo,
      minScore,
      page,
    );
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
