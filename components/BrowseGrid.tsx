import Link from "next/link";
import { MangaCard } from "./MangaCard";
import { fetchMangaList } from "@/lib/mangadex";
import {
  SORT_ORDER,
  sortLabel,
  tagIdFor,
  type SortKey,
} from "@/lib/genres";

type BrowseGridProps = {
  sort: SortKey;
  genre?: string;
  page: number;
};

const PER_PAGE = 24;

function pageHref(sort: SortKey, genre: string | undefined, page: number) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (genre) params.set("genre", genre);
  params.set("page", String(page));
  return `/browse?${params.toString()}`;
}

export async function BrowseGrid({ sort, genre, page }: BrowseGridProps) {
  const offset = (page - 1) * PER_PAGE;
  const tagId = genre ? tagIdFor(genre) : undefined;

  const { data: results, total } = await fetchMangaList({
    limit: PER_PAGE,
    offset,
    order: SORT_ORDER[sort],
    includedTags: tagId ? [tagId] : undefined,
  });

  if (!results.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🔍
        </span>
        <h2 className="text-xl font-bold text-white">Nothing here yet</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          Try a different genre or sort order.
        </p>
      </div>
    );
  }

  const hasPrevious = page > 1;
  const hasNext = offset + results.length < total;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        {total.toLocaleString()} {total === 1 ? "title" : "titles"}
        {genre ? (
          <>
            {" "}
            in{" "}
            <span className="font-semibold text-zinc-200">{genre}</span>
          </>
        ) : null}{" "}
        ·{" "}
        <span className="font-semibold text-zinc-200">
          {sortLabel(sort)}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((manga) => (
          <MangaCard key={manga.id} manga={manga} className="w-full!" />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-4">
        {hasPrevious ? (
          <Link
            href={pageHref(sort, genre, page - 1)}
            className="rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition active:scale-[0.97] hover:bg-zinc-800 hover:text-white"
          >
            ← Previous
          </Link>
        ) : (
          <span className="px-5 py-2" />
        )}
        <span className="text-sm text-zinc-500">
          Page {page} of {lastPage}
        </span>
        {hasNext ? (
          <Link
            href={pageHref(sort, genre, page + 1)}
            className="rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition active:scale-[0.97] hover:bg-zinc-800 hover:text-white"
          >
            Next →
          </Link>
        ) : (
          <span className="px-5 py-2" />
        )}
      </div>
    </>
  );
}
