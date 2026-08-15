import type { Metadata } from "next";
import { BrowseFilters } from "@/components/BrowseFilters";
import { BrowseGrid } from "@/components/BrowseGrid";
import {
  isRatingKey,
  isSortKey,
  isStatusKey,
  RATING_VALUES,
  SORT_ORDER,
  tagIdFor,
  type SortKey,
} from "@/lib/genres";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList, type Manga } from "@/lib/mangadex";

export const metadata: Metadata = {
  title: "Browse — Hana",
  description:
    "Browse the manga catalog — sort by popularity, trending, or rating and filter by genre, status, and content rating.",
};

const PER_PAGE = 24;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sortParam = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const genreParam = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const ratingParam = Array.isArray(params.rating) ? params.rating[0] : params.rating;

  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";
  const genre = genreParam?.trim() || undefined;
  const status = isStatusKey(statusParam ?? "") ? (statusParam ?? "") : "";
  const rating = isRatingKey(ratingParam ?? "") ? (ratingParam ?? "") : "";

  let initialResults: Manga[] = [];
  let total = 0;
  let errored = false;
  try {
    let result;
    try {
      result = await fetchAniListList({
        limit: PER_PAGE,
        offset: 0,
        sort,
        genre: genre || undefined,
        status: status || undefined,
        rating: rating || undefined,
      });
    } catch {
      const tagId = genre ? tagIdFor(genre) : undefined;
      result = await fetchMangaList({
        limit: PER_PAGE,
        offset: 0,
        order: SORT_ORDER[sort],
        includedTags: tagId ? [tagId] : undefined,
        status: status ? [status] : undefined,
        contentRating: rating ? RATING_VALUES[rating] : undefined,
      });
    }
    initialResults = result.data;
    total = result.total;
  } catch {
    errored = true;
  }

  const browseKey = `${sort}-${genre ?? ""}-${status}-${rating}`;

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Browse
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Explore the catalog by rating, popularity, or genre.
          </p>
        </header>

        <BrowseFilters sort={sort} genre={genre} status={status} rating={rating} />

        <BrowseGrid
          key={browseKey}
          sort={sort}
          genre={genre}
          status={status}
          rating={rating}
          initialResults={initialResults}
          total={total}
          initialPage={1}
          errored={errored}
        />
      </div>
    </main>
  );
}
