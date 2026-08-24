"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MangaCard } from "./MangaCard";
import { MangaGridSkeleton } from "./MangaCardSkeleton";
import type { Manga } from "@/lib/mangadex";

type SearchResultsProps = {
  query: string;
  /** When set, results are manga by this author (AniList staff search). */
  author?: string;
  /** Canonical name AniList matched for the author, when known. */
  authorName?: string;
  /** Profile image from AniList, when available. */
  authorImageUrl?: string | null;
  initialData: Manga[];
  total: number;
  errored: boolean;
};

export function SearchResults({
  query,
  author,
  authorName,
  authorImageUrl,
  initialData,
  total,
  errored,
}: SearchResultsProps) {
  const [items, setItems] = useState<Manga[]>(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errored);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const hasMore = items.length < total;

  const loadMore = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const param = author
          ? `author=${encodeURIComponent(author)}`
          : `q=${encodeURIComponent(query)}`;
        const res = await fetch(`/api/search?${param}&page=${targetPage}`);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error("request failed");
        const next = (json.data as Manga[]) ?? [];
        setItems((prev) => (replace ? next : [...prev, ...next]));
        setPage(targetPage);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [query, author],
  );

  useEffect(() => {
    if (!hasMore || loading || error) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(page + 1, false);
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error, page, loadMore]);

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-white">Search failed</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          The catalog service is temporarily unavailable. Please try again.
        </p>
        <button
          type="button"
          onClick={() => void loadMore(1, true)}
          className="mt-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-12 py-16 text-center md:flex-row md:items-center md:justify-center md:gap-20 md:text-left">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[10rem] font-black leading-none tracking-tighter text-white/[0.04] md:text-[16rem]"
        >
          0
        </span>
        <Image
          src="/noresult.gif"
          alt="A clueless anime girl, searching for something that is not there"
          width={200}
          height={216}
          unoptimized
          className="h-52 w-auto shrink-0 rounded-2xl object-cover"
        />
        <div className="relative flex max-w-md flex-col items-center text-center md:items-start md:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
            No results
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white">
            {author
              ? `No manga found by “${authorName ?? author}”`
              : `Nothing found for “${query}”`}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            {author
              ? "Check the spelling, or try their romanized name (e.g. “Eiichirou Oda”)."
              : "Try a different title, or check your spelling. Manga catalogs are constantly growing."}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M3 9.5 12 3l9 6.5" />
                <path d="M5 8.5V21h14V8.5" />
              </svg>
              Back to Catalog
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
            >
              Browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        {author ? (
          <span className="inline-flex items-center gap-2">
            {authorImageUrl ? (
              <Image
                src={authorImageUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-zinc-500" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            )}
            {total.toLocaleString()} {total === 1 ? "work" : "works"} by{" "}
            <span className="font-semibold text-zinc-200">
              {authorName ?? author}
            </span>
          </span>
        ) : (
          <>
            {total.toLocaleString()} {total === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-zinc-200">“{query}”</span>
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((manga) => (
          <MangaCard key={manga.id} manga={manga} className="w-full!" />
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="mt-10 flex items-center justify-center">
          {error ? (
            <button
              type="button"
              onClick={() => void loadMore(page + 1, false)}
              className="rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition hover:bg-zinc-800 hover:text-white"
            >
              Retry
            </button>
          ) : loading ? (
            <MangaGridSkeleton count={6} />
          ) : null}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-zinc-500">
          You’ve reached the end.
        </p>
      )}
    </>
  );
}
