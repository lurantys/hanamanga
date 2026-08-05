"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GENRES, SORTS, type SortKey } from "@/lib/genres";

type BrowseFiltersProps = {
  sort: SortKey;
  genre?: string;
  page: number;
};

function hrefFor({ sort, genre }: { sort: string; genre?: string }) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (genre) params.set("genre", genre);
  return `/browse?${params.toString()}`;
}

export function BrowseFilters({ sort, genre, page }: BrowseFiltersProps) {
  const router = useRouter();

  const onGenreChange = (value: string) => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    if (value) params.set("genre", value);
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
        {SORTS.map((option) => (
          <Link
            key={option.key}
            href={hrefFor({ sort: option.key, genre })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
              sort === option.key
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="relative">
        <select
          value={genre ?? ""}
          onChange={(event) => onGenreChange(event.target.value)}
          aria-label="Filter by genre"
          className="appearance-none rounded-full border border-white/10 bg-zinc-900/60 py-2 pl-4 pr-9 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors hover:border-white/25 focus:border-emerald-400/50"
        >
          <option value="">All Genres</option>
          {GENRES.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {page > 1 && (
        <Link
          href={hrefFor({ sort, genre })}
          className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition-colors hover:bg-zinc-800 hover:text-white"
        >
          Back to page 1
        </Link>
      )}
    </div>
  );
}
