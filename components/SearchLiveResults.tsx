"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { statusLabel, type Manga } from "@/lib/mangadex";

type SearchLiveResultsProps = {
  query: string;
  onPick: () => void;
};

type AuthorHit = { id: number; name: string; imageUrl?: string | null };

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
  const [authors, setAuthors] = useState<AuthorHit[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (controller.signal.aborted) return;
        if (!json?.data) {
          setFailed(true);
          setData([]);
          return;
        }
        setFailed(false);
        setData(json.data);
        setAuthors(
          Array.isArray(json.authors)
            ? (json.authors as AuthorHit[]).filter(
                (author) =>
                  author &&
                  typeof author.id === "number" &&
                  typeof author.name === "string",
              )
            : [],
        );
      })
      .catch((error) => {
        if (error?.name === "AbortError" || controller.signal.aborted) return;
        setFailed(true);
        setData([]);
      });
    return () => controller.abort();
  }, [query]);

  if (query.trim().length < 2) {
    return (
      <div className="px-2 py-6 text-center">
        <p className="text-sm font-medium text-zinc-500">
          Type at least 2 characters to search.
        </p>
      </div>
    );
  }

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

  if (!data.length && !authors.length) {
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
      {authors.length > 0 && (
        <div className="mb-2">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            By author
          </p>
          <div className="space-y-0.5">
            {authors.map((author) => (
              <Link
                key={author.id}
                href={`/search?author=${encodeURIComponent(author.name)}`}
                prefetch={false}
                onClick={onPick}
                aria-label={`Manga by ${author.name}. Open search results.`}
                className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-zinc-800/70"
              >
                {author.imageUrl ? (
                  <Image
                    src={author.imageUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors group-hover:bg-zinc-700 group-hover:text-zinc-200">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-200">
                    {author.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    Author
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-zinc-400"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
          {data.length > 0 && <div className="mx-2 mt-2 border-t border-white/5" />}
        </div>
      )}
      <div className="max-h-[55vh] space-y-0.5 overflow-y-auto pr-1">
        {data.map((manga) => {
          const rating = manga.rating ?? 0;
          return (
            <Link
              key={manga.id}
              href={`/manga/${manga.id}`}
              prefetch={false}
              onClick={onPick}
              aria-label={`${manga.title}. Open detail page.`}
              className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-zinc-800/70"
            >
              <div className="relative aspect-[2/3] h-14 w-auto shrink-0 overflow-hidden rounded-md bg-zinc-800">
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

      {data.length > 0 && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={onPick}
            className="flex items-center justify-between rounded-xl px-2 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-zinc-800/70 hover:text-red-200"
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
      )}
    </div>
  );
}
