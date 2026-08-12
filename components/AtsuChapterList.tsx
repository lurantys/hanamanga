"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { atsuChapterLabel } from "@/lib/atsu";
import { markAllRead, useReadChapters } from "@/lib/read-state";

type AtsuChapterListProps = {
  mangaId: string;
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  defaultScanlatorId?: string | null;
};

const BATCH = 100;

export function AtsuChapterList({
  mangaId,
  scanlators,
  chapters,
  defaultScanlatorId,
}: AtsuChapterListProps) {
  const [selected, setSelected] = useState(
    defaultScanlatorId ?? scanlators[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [revealed, setRevealed] = useState(BATCH);
  const [jump, setJump] = useState("");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const readChapters = useReadChapters(mangaId);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const groupChapters = useMemo(
    () =>
      chapters
        .filter((chapter) => chapter.scanlationMangaId === selected)
        .sort((a, b) => a.index - b.index),
    [chapters, selected],
  );

  const orderedChapters = useMemo(
    () => (order === "newest" ? [...groupChapters].reverse() : groupChapters),
    [groupChapters, order],
  );

  const visibleChapters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? orderedChapters.filter((chapter) =>
          atsuChapterLabel(chapter).toLowerCase().includes(needle),
        )
      : orderedChapters;
    return query.trim() ? base : base.slice(0, revealed);
  }, [orderedChapters, query, revealed]);

  const hasMore = !query.trim() && revealed < orderedChapters.length;

  const loadMore = () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRevealed((value) => value + BATCH);
    loadingRef.current = false;
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, orderedChapters.length, revealed]);

  useEffect(() => {
    if (!scrollTarget) return;
    const el = itemRefs.current[scrollTarget];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollTarget, orderedChapters]);

  const goToChapter = () => {
    const target = Number(jump.trim());
    if (!Number.isFinite(target)) return;
    const index = orderedChapters.findIndex(
      (chapter) => chapter.number === target,
    );
    if (index === -1) return;
    if (index + 1 > revealed) setRevealed(index + 1);
    setScrollTarget(orderedChapters[index].id);
  };

  const startFromBeginning = () => {
    const firstId = orderedChapters[0]?.id;
    if (!firstId) return;
    setOrder("oldest");
    setRevealed(BATCH);
    setScrollTarget(firstId);
  };

  const hasMultipleScanlators = scanlators.length > 1;
  const readCount = groupChapters.filter((chapter) =>
    readChapters.has(chapter.id),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hasMultipleScanlators ? (
          <div className="flex flex-wrap gap-2">
            {scanlators.map((scanlator) => (
              <button
                key={scanlator.id}
                type="button"
                onClick={() => setSelected(scanlator.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selected === scanlator.id
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                {scanlator.name}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {groupChapters.length > 0 && (
            <button
              type="button"
              onClick={() =>
                markAllRead(
                  mangaId,
                  groupChapters.map((chapter) => chapter.id),
                )
              }
              className="shrink-0 rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
            >
              Mark all read
            </button>
          )}
          <label className="relative block sm:w-56">
            <span className="sr-only">Find a chapter</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Find chapter (${groupChapters.length} available)`}
              className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/50"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-zinc-900/60 p-1">
          {(["newest", "oldest"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOrder(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
                order === value
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {value === "newest" ? "Newest" : "Oldest"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={jump}
            onChange={(event) => setJump(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") goToChapter();
            }}
            placeholder="Ch. #"
            aria-label="Jump to chapter number"
            className="w-24 rounded-lg border border-white/10 bg-zinc-900/60 py-2 pl-3 pr-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/50"
          />
          <button
            type="button"
            onClick={goToChapter}
            className="rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-emerald-400/40 hover:text-white"
          >
            Go
          </button>
        </div>

        <button
          type="button"
          onClick={startFromBeginning}
          className="rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-emerald-400/40 hover:text-white"
        >
          Start from beginning
        </button>
      </div>

      {groupChapters.length > 0 && readCount > 0 && (
        <p className="text-xs text-zinc-500">
          {readCount.toLocaleString()} of {groupChapters.length.toLocaleString()}{" "}
          chapters read
        </p>
      )}

      {visibleChapters.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-10 text-center">
          <p className="text-sm text-zinc-400">
            {query
              ? `No chapters match "${query}".`
              : "No chapters from this group."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleChapters.map((chapter) => {
            const isRead = readChapters.has(chapter.id);
            return (
              <Link
                key={chapter.id}
                ref={(el) => {
                  itemRefs.current[chapter.id] = el;
                }}
                href={`/read/${mangaId}/${chapter.id}`}
                className={`group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 backdrop-blur-xl transition-colors ${
                  isRead
                    ? "hover:border-emerald-400/30"
                    : "hover:border-emerald-400/40"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold group-hover:text-white ${
                      isRead ? "text-zinc-500" : "text-zinc-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isRead && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                          aria-hidden
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                      <span className="truncate">{atsuChapterLabel(chapter)}</span>
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {chapter.pageCount}{" "}
                    {chapter.pageCount === 1 ? "page" : "pages"}
                    {chapter.createdAt
                      ? ` · ${new Date(chapter.createdAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors group-hover:border-emerald-400/40 group-hover:bg-zinc-700/60 group-hover:text-white">
                  {isRead ? "Re-read" : "Read"}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
