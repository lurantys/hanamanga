"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { atsuChapterLabel } from "@/lib/atsu";
import { MarkReadButton } from "./MarkReadButton";
import { markAllRead, useReadChapters } from "@/lib/read-state";
import { setPreferredScanlator, usePreferredScanlator } from "@/lib/scanlator-preference";
import { getProgress, PROGRESS_EVENT, invalidateProgressCache } from "@/lib/progress";
import { chipButton, focusRing, inputField } from "@/lib/ui";
import { useChapterFlash } from "@/lib/use-chapter-flash";

type AtsuChapterListProps = {
  mangaId: string;
  mangaTitle: string;
  coverUrl?: string | null;
  alternateIds?: (string | null | undefined)[];
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  defaultScanlatorId?: string | null;
};

const BATCH = 100;

export function AtsuChapterList({
  mangaId,
  mangaTitle,
  coverUrl,
  alternateIds,
  scanlators,
  chapters,
  defaultScanlatorId,
}: AtsuChapterListProps) {
  const preferred = usePreferredScanlator(mangaId);
  const selected = scanlators.some((scanlator) => scanlator.id === preferred)
    ? preferred
    : (defaultScanlatorId ?? scanlators[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [revealed, setRevealed] = useState(BATCH);
  const [jump, setJump] = useState("");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const { highlightId, flash: flashChapter } = useChapterFlash();

  // If user has progress on a different scanlator, auto-switch so continue/read pops are visible
  useEffect(() => {
    const progress = getProgress(mangaId);
    if (!progress) return;
    const scanlatorForProgress = chapters.find((c) => c.id === progress.chapterId)?.scanlationMangaId;
    if (scanlatorForProgress && scanlatorForProgress !== selected) {
      setPreferredScanlator(mangaId, scanlatorForProgress);
    }
    const onProgress = () => {
      const p = getProgress(mangaId);
      const s = p ? chapters.find((c) => c.id === p.chapterId)?.scanlationMangaId : null;
      if (s && s !== getProgress(mangaId)?.chapterId) {
        // handled above
      }
      if (s && s !== selected) {
        setPreferredScanlator(mangaId, s);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "hana:progress") {
        invalidateProgressCache();
        onProgress();
      }
    };
    window.addEventListener(PROGRESS_EVENT, onProgress);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onProgress);
      window.removeEventListener("storage", onStorage);
    };
  }, [mangaId, chapters, selected]);

  const readChapters = useReadChapters(mangaId);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const groupChapters = useMemo(
    () =>
      chapters
        .filter((chapter) => chapter.scanlationMangaId === selected)
        .sort((a, b) => a.index - b.index),
    [chapters, selected],
  );

  const readingOrder = useMemo(
    () =>
      groupChapters.map((chapter) => ({
        id: chapter.id,
        label: atsuChapterLabel(chapter),
      })),
    [groupChapters],
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
    const chapterId = orderedChapters[index].id;
    if (index + 1 > revealed) setRevealed(index + 1);
    setScrollTarget(chapterId);
    flashChapter(chapterId);
  };

  const startFromBeginning = () => {
    const firstId = groupChapters[0]?.id;
    if (!firstId) return;
    setOrder("oldest");
    setRevealed(BATCH);
    setScrollTarget(firstId);
    flashChapter(firstId);
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
                onClick={() => setPreferredScanlator(mangaId, scanlator.id)}
                aria-pressed={selected === scanlator.id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${focusRing} ${
                  selected === scanlator.id
                    ? "border-red-400/60 bg-red-500/15 text-red-300"
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
              className={`${chipButton} shrink-0 py-2`}
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
              className={`${inputField} w-full py-2 pl-9 pr-3 hover:border-white/25`}
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
              aria-pressed={order === value}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 active:scale-[0.97] ${focusRing} ${
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
            className={`${inputField} w-24 py-2 pl-3 pr-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <button type="button" onClick={goToChapter} className={chipButton}>
            Go
          </button>
        </div>

        <button type="button" onClick={startFromBeginning} className={chipButton}>
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-center">
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
              <div
                key={chapter.id}
                ref={(el) => {
                  itemRefs.current[chapter.id] = el;
                }}
                className={`group relative flex items-center justify-between gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 ${
                  highlightId === chapter.id
                    ? "animate-chapter-highlight border-red-400/50 bg-red-500/20"
                    : "border-white/10 bg-zinc-900/60"
                }`}
              >
                <Link
                  href={`/read/${mangaId}/${chapter.id}`}
                  prefetch={false}
                  aria-label={`Read ${atsuChapterLabel(chapter)}`}
                  className={`absolute inset-0 rounded-xl ${focusRing}`}
                />
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold group-hover:text-white ${
                      isRead ? "text-zinc-500" : "text-zinc-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isRead && (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-red-400" role="img" aria-label="Read">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                            aria-hidden
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                      <span className="truncate">{atsuChapterLabel(chapter)}</span>
                    </span>                  </p>
                  <p className="text-xs text-zinc-500">
                    {chapter.pageCount > 0
                      ? `${chapter.pageCount} ${
                          chapter.pageCount === 1 ? "page" : "pages"
                        }`
                      : null}
                    {chapter.createdAt
                      ? `${chapter.pageCount > 0 ? " · " : ""}${new Date(chapter.createdAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <div className="pointer-events-none relative flex shrink-0 items-center gap-2">
                  {!isRead && (
                    <MarkReadButton
                      mangaId={mangaId}
                      mangaTitle={mangaTitle}
                      coverUrl={coverUrl}
                      alternateIds={alternateIds}
                      chapters={readingOrder}
                      chapterId={chapter.id}
                    />
                  )}
                  <span className="rounded-full border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 group-hover:border-red-400/40 group-hover:bg-zinc-700/60 group-hover:text-white">
                    {isRead ? "Re-read" : "Read"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            className={`rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-semibold text-zinc-200 transition-colors duration-200 hover:border-red-400/40 hover:bg-zinc-800 hover:text-white ${focusRing}`}
          >
            Show more chapters
          </button>
        </div>
      ) : (
        groupChapters.length > 0 && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            All {groupChapters.length.toLocaleString()} chapters loaded.
          </p>
        )
      )}
    </div>
  );
}
