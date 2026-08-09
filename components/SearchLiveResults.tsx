"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { statusLabel, type Manga } from "@/lib/mangadex";

type SearchLiveResultsProps = {
  query: string;
  onPick: () => void;
};

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-1.5">
          <div className="h-14 w-10 shrink-0 animate-pulse rounded-md bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-zinc-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchLiveResults({ query, onPick }: SearchLiveResultsProps) {
  const [data, setData] = useState<Manga[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (!json?.data) {
          setFailed(true);
          setData([]);
          return;
        }
        setData(json.data);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setData([]);
      });
    return () => {
      active = false;
    };
  }, [query]);

  if (data === null) {
    return <ListSkeleton />;
  }

  if (failed) {
    return (
      <div className="px-2 py-6 text-center">
        <p className="text-sm font-medium text-red-300">
          Search is unavailable right now.
        </p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="px-2 py-6 text-center">
        <p className="text-sm font-medium text-zinc-300">
          No results for “{query}”
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Check the spelling or try another title.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-h-[55vh] space-y-0.5 overflow-y-auto pr-1">
        {data.map((manga) => {
          const rating = manga.rating ?? 0;
          return (
            <Link
              key={manga.id}
              href={`/manga/${manga.id}`}
              onClick={onPick}
              aria-label={`${manga.title}. Open detail page.`}
              className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-zinc-900/70"
            >
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                {manga.coverUrl ? (
                  <Image
                    src={manga.coverUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-200">
                  {manga.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {rating > 0 ? `${rating.toFixed(1)} · ` : ""}
                  {statusLabel(manga.status)}
                  {manga.year ? ` · ${manga.year}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-2 border-t border-white/5 pt-2">
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onPick}
          className="flex items-center justify-between rounded-xl px-2 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-zinc-900/70 hover:text-red-200"
        >
          <span className="truncate">See all results for “{query}”</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
