"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MangaCard } from "./MangaCard";
import { MangaGridSkeleton } from "./MangaCardSkeleton";
import { sortLabel, type SortKey } from "@/lib/genres";
import type { Manga } from "@/lib/mangadex";

type BrowseGridProps = {
  sort: SortKey;
  genres: string[];
  status?: string;
  rating?: string;
  origin?: string;
  yearFrom?: string;
  yearTo?: string;
  minScore?: string;
  initialResults: Manga[];
  total: number;
  initialPage: number;
  errored: boolean;
};

export function BrowseGrid({
  sort,
  genres,
  status,
  rating,
  origin,
  yearFrom,
  yearTo,
  minScore,
  initialResults,
  total,
  initialPage,
  errored,
}: BrowseGridProps) {
  const [items, setItems] = useState<Manga[]>(initialResults);
  const [page, setPage] = useState(initialPage);
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
        const params = new URLSearchParams({ sort, page: String(targetPage) });
        if (genres.length) params.set("genres", genres.join(","));
        if (status) params.set("status", status);
        if (rating) params.set("rating", rating);
        if (origin) params.set("origin", origin);
        if (yearFrom) params.set("yearFrom", yearFrom);
        if (yearTo) params.set("yearTo", yearTo);
        if (minScore) params.set("minScore", minScore);
        const res = await fetch(`/api/browse?${params.toString()}`);
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
    [sort, genres, status, rating, origin, yearFrom, yearTo, minScore],
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
        <h2 className="text-xl font-bold text-white">Couldn’t load titles</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          The catalog service is temporarily unavailable. Please try again.
        </p>
        <button
          type="button"
          onClick={() => void loadMore(initialPage, true)}
          className="mt-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🔍
        </span>
        <h2 className="text-xl font-bold text-white">Nothing here yet</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          Try a different genre, status, or sort order.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-zinc-400">
        {total.toLocaleString()} {total === 1 ? "title" : "titles"}
        {genres.length ? (
          <>
            {" "}
            in{" "}
            <span className="font-semibold text-zinc-200">
              {genres.join(" + ")}
            </span>
          </>
        ) : null}{" "}
        ·{" "}
        <span className="font-semibold text-zinc-200">{sortLabel(sort)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
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
            <MangaGridSkeleton count={7} />
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
