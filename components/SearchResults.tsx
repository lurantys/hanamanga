import Link from "next/link";
import { MangaCard } from "./MangaCard";
import { searchCatalog } from "@/lib/catalog";

type SearchResultsProps = {
  query: string;
};

export async function SearchResults({ query }: SearchResultsProps) {
  const { data: results, total } = await searchCatalog(query);

  if (!results.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🔎
        </span>
        <h2 className="text-xl font-bold text-white">No results for “{query}”</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          Try a different title, or check your spelling. Manga catalogs are
          constantly growing.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        {total.toLocaleString()} {total === 1 ? "result" : "results"} for{" "}
        <span className="font-semibold text-zinc-200">“{query}”</span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((manga) => (
          <MangaCard key={manga.id} manga={manga} className="w-full!" />
        ))}
      </div>
    </>
  );
}
