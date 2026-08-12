"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GENRES,
  RATING_OPTIONS,
  SORTS,
  STATUS_OPTIONS,
  type SortKey,
} from "@/lib/genres";

type BrowseFiltersProps = {
  sort: SortKey;
  genre?: string;
  status?: string;
  rating?: string;
};

function hrefFor({
  sort,
  genre,
  status,
  rating,
}: {
  sort: string;
  genre?: string;
  status?: string;
  rating?: string;
}) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (genre) params.set("genre", genre);
  if (status) params.set("status", status);
  if (rating) params.set("rating", rating);
  return `/browse?${params.toString()}`;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="appearance-none rounded-full border border-white/10 bg-zinc-900/60 py-2 pl-4 pr-9 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors hover:border-white/25 focus:border-emerald-400/50"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
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
  );
}

export function BrowseFilters({ sort, genre, status, rating }: BrowseFiltersProps) {
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
        {SORTS.map((option) => (
          <Link
            key={option.key}
            href={hrefFor({ sort: option.key, genre, status, rating })}
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

      <Select
        label="Filter by genre"
        value={genre ?? ""}
        options={[{ key: "", label: "All Genres" }, ...GENRES.map((item) => ({ key: item.name, label: item.name }))]}
        onChange={(value) =>
          router.push(hrefFor({ sort, genre: value, status, rating }))
        }
      />

      <Select
        label="Filter by status"
        value={status ?? ""}
        options={STATUS_OPTIONS}
        onChange={(value) =>
          router.push(hrefFor({ sort, genre, status: value, rating }))
        }
      />

      <Select
        label="Filter by content rating"
        value={rating ?? ""}
        options={RATING_OPTIONS}
        onChange={(value) =>
          router.push(hrefFor({ sort, genre, status, rating: value }))
        }
      />
    </div>
  );
}
