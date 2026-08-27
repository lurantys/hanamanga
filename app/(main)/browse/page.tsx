import type { Metadata } from "next";
import { BrowseFilters } from "@/components/BrowseFilters";
import { BrowseGrid } from "@/components/BrowseGrid";
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
  const genresRaw = Array.isArray(params.genres)
    ? params.genres[0]
    : params.genres;
  const genreLegacy = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const ratingParam = Array.isArray(params.rating) ? params.rating[0] : params.rating;
  const originParam = Array.isArray(params.origin) ? params.origin[0] : params.origin;
  const yearFromParam = Array.isArray(params.yearFrom)
    ? params.yearFrom[0]
    : params.yearFrom;
  const yearToParam = Array.isArray(params.yearTo)
    ? params.yearTo[0]
    : params.yearTo;
  const minScoreParam = Array.isArray(params.minScore)
    ? params.minScore[0]
    : params.minScore;

  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";
  const genres = (genresRaw ?? genreLegacy ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const status = isStatusKey(statusParam ?? "") ? (statusParam ?? "") : "";
  const rating = isRatingKey(ratingParam ?? "") ? (ratingParam ?? "") : "";
  const origin = isOriginKey(originParam ?? "") ? (originParam ?? "") : "";
  const yearFrom = /^\d{4}$/.test(yearFromParam ?? "") ? yearFromParam ?? "" : "";
  const yearTo = /^\d{4}$/.test(yearToParam ?? "") ? yearToParam ?? "" : "";
  const minScore = isMinScoreKey(minScoreParam ?? "") ? (minScoreParam ?? "") : "";

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
        genres,
        status: status || undefined,
        rating: rating || undefined,
        origin: origin || undefined,
        yearFrom: yearFrom ? Number(yearFrom) : undefined,
        yearTo: yearTo ? Number(yearTo) : undefined,
        minScore: minScore ? Number(minScore) : undefined,
      });
    } catch {
      const tagIds = genres.map(tagIdFor).filter((id): id is string => Boolean(id));
      result = await fetchMangaList({
        limit: PER_PAGE,
        offset: 0,
        order: SORT_ORDER[sort],
        includedTags: tagIds,
        status: status ? [status] : undefined,
        contentRating: rating ? RATING_VALUES[rating] : undefined,
        year: yearFrom && yearFrom === yearTo ? Number(yearFrom) : undefined,
      });
    }
    initialResults = result.data;
    total = result.total;
  } catch {
    errored = true;
  }

  const browseKey = `${sort}-${genres.join(",")}-${status}-${rating}-${origin}-${yearFrom}-${yearTo}-${minScore}`;

  return (
    <main className="bg-zinc-950 pb-8 lg:pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Browse
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Explore the catalog by rating, popularity, or genre.
          </p>
        </header>

        <BrowseFilters
          sort={sort}
          genres={genres}
          status={status}
          rating={rating}
          origin={origin}
          yearFrom={yearFrom}
          yearTo={yearTo}
          minScore={minScore}
        />

        <BrowseGrid
          key={browseKey}
          sort={sort}
          genres={genres}
          status={status}
          rating={rating}
          origin={origin}
          yearFrom={yearFrom}
          yearTo={yearTo}
          minScore={minScore}
          initialResults={initialResults}
          total={total}
          initialPage={1}
          errored={errored}
        />
      </div>
    </main>
  );
}
