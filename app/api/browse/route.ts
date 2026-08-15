import { NextResponse } from "next/server";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList } from "@/lib/mangadex";
import {
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

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const sortParam = sp.get("sort") ?? "popular";
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";
  const genre = sp.get("genre")?.trim() || undefined;
  const statusParam = sp.get("status")?.trim() || undefined;
  const status = isStatusKey(statusParam ?? "") ? (statusParam ?? "") : "";
  const ratingParam = sp.get("rating")?.trim() || undefined;
  const rating = isRatingKey(ratingParam ?? "") ? (ratingParam ?? "") : "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const offset = (page - 1) * PER_PAGE;

  try {
    let result;
    try {
      result = await fetchAniListList({
        limit: PER_PAGE,
        offset,
        sort,
        genre: genre || undefined,
        status: status || undefined,
        rating: rating || undefined,
      });
    } catch {
      const tagId = genre ? tagIdFor(genre) : undefined;
      result = await fetchMangaList({
        limit: PER_PAGE,
        offset,
        order: SORT_ORDER[sort],
        includedTags: tagId ? [tagId] : undefined,
        status: status ? [status] : undefined,
        contentRating: rating ? RATING_VALUES[rating] : undefined,
      });
    }
    const { data, total } = result;
    return NextResponse.json({ data, total, page });
  } catch {
    return NextResponse.json(
      { data: [], total: 0, error: "unavailable" },
      { status: 502 },
    );
  }
}
