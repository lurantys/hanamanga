import type { Metadata } from "next";
import Link from "next/link";
import { SearchResults } from "@/components/SearchResults";
import { searchCatalog } from "@/lib/catalog";
import type { Manga } from "@/lib/mangadex";

export const metadata: Metadata = {
  title: "Search — Hana",
};

const POOL = 60;
const FIRST_PAGE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";

  if (!query) {
    return (
      <main className="bg-zinc-950 pb-24">
        <div className="px-5 pt-28 md:px-10">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
            <span className="text-5xl" aria-hidden>
              🔍
            </span>
            <h1 className="text-xl font-bold text-white">Search the catalog</h1>
            <p className="max-w-sm text-sm text-zinc-400">
              Type a title in the search box above to discover manga from the
              Hana catalog.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let initialData: Manga[] = [];
  let total = 0;
  let errored = false;
  try {
    const pool = await searchCatalog(query, POOL);
    initialData = pool.data.slice(0, FIRST_PAGE);
    total = pool.data.length;
  } catch {
    errored = true;
  }

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          Search Results
        </h1>
        <SearchResults
          key={query}
          query={query}
          initialData={initialData}
          total={total}
          errored={errored}
        />
      </div>
    </main>
  );
}
