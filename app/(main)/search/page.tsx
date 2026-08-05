import { Suspense } from "react";
import Link from "next/link";
import { SearchResults } from "@/components/SearchResults";

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[2/3] w-full animate-pulse rounded-lg bg-zinc-800"
        />
      ))}
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        {query ? (
          <>
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Search Results
            </h1>
            <Suspense fallback={<ResultsSkeleton />}>
              <div className="mt-4">
                <SearchResults query={query} />
              </div>
            </Suspense>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
            <span className="text-5xl" aria-hidden>
              🔍
            </span>
            <h1 className="text-xl font-bold text-white">Search the catalog</h1>
            <p className="max-w-sm text-sm text-zinc-400">
              Type a title in the search box above to discover manga from the
              MangaDex catalog.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Back to Catalog
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
