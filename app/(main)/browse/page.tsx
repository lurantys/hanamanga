import { Suspense } from "react";
import type { Metadata } from "next";
import { BrowseFilters } from "@/components/BrowseFilters";
import { BrowseGrid } from "@/components/BrowseGrid";
import { isSortKey, type SortKey } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Browse — Hana",
  description:
    "Browse the manga catalog — sort by popularity, trending, or rating and filter by genre.",
};

function BrowseSkeleton() {
  return (
    <>
      <div className="mb-4 h-5 w-48 animate-pulse rounded-full bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[2/3] w-full animate-pulse rounded-lg bg-zinc-800"
          />
        ))}
      </div>
    </>
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sortParam = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const genreParam = Array.isArray(params.genre) ? params.genre[0] : params.genre;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;

  const sort: SortKey = isSortKey(sortParam) ? sortParam : "popular";
  const genre = genreParam?.trim() || undefined;
  const page = Math.max(1, Number(pageParam) || 1);

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

        <BrowseFilters sort={sort} genre={genre} page={page} />

        <Suspense fallback={<BrowseSkeleton />}>
          <BrowseGrid sort={sort} genre={genre} page={page} />
        </Suspense>
      </div>
    </main>
  );
}
