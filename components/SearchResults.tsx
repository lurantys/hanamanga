"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MangaCard } from "./MangaCard";
import { MangaGridSkeleton } from "./MangaCardSkeleton";
import { EmptyState } from "./EmptyState";
import { ctaPrimary, ctaSecondary, focusRing } from "@/lib/ui";
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
      <EmptyState
        title="Search failed"
        description="The catalog service is temporarily unavailable. Please try again."
        action={
          <button
            type="button"
            onClick={() => void loadMore(1, true)}
            className={`${ctaPrimary} mt-2`}
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        className="my-16"
        art={
          <Image
            src="/noresult.gif"
            alt="A clueless anime girl, searching for something that is not there"
            width={200}
            height={216}
            unoptimized
            className="h-40 w-auto rounded-2xl object-cover"
          />
        }
        title={
          author
            ? `No manga found by “${authorName ?? author}”`
            : `Nothing found for “${query}”`
        }
        description={
          author
            ? "Check the spelling, or try their romanized name (e.g. “Eiichirou Oda”)."
            : "Try a different title, or check your spelling. Manga catalogs are constantly growing."
        }
        action={
          <>
            <Link href="/" className={ctaPrimary}>
              Back to Catalog
            </Link>
            <Link href="/browse" className={ctaSecondary}>
              Browse
            </Link>
          </>
        }
      />
    );
  }

  return (
    <>
      <p className={`${author ? "pt-3" : ""} mb-5 text-sm text-zinc-400`}>
        {author ? (
          <span className="inline-flex items-center gap-3">
            {authorImageUrl ? (
              <Image
                src={authorImageUrl}
                alt={authorName ?? author}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
              />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-zinc-500" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-zinc-100">
                {authorName ?? author}
              </span>
              <span>
                {total.toLocaleString()} {total === 1 ? "work" : "works"}
              </span>
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
          <div key={manga.id} style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}>
            <MangaCard manga={manga} className="w-full!" />
          </div>
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-4">
          <p aria-live="polite" className="sr-only">
            {loading
              ? "Loading more results…"
              : error
                ? "Loading more results failed."
                : ""}
          </p>
          {error ? (
            <button
              type="button"
              onClick={() => void loadMore(page + 1, false)}
              className={`rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition-colors duration-200 hover:bg-zinc-800 hover:text-white ${focusRing}`}
            >
              Retry
            </button>
          ) : loading ? (
            <MangaGridSkeleton count={6} />
          ) : (
            <button
              type="button"
              onClick={() => void loadMore(page + 1, false)}
              className={`rounded-full border border-white/10 bg-zinc-900/60 px-6 py-2.5 text-sm font-semibold text-zinc-200 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 hover:bg-zinc-800 hover:text-white ${focusRing}`}
            >
              Load more results
            </button>
          )}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-zinc-500">
          You’ve reached the end.
        </p>
      )}
    </>
  );
}
