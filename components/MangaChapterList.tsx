"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChapterReadCheck } from "./ChapterReadCheck";
import { MarkReadButton } from "./MarkReadButton";
import { chipButton, focusRing } from "@/lib/ui";
import { markAllRead, markMangaRead, useMangaRead, useReadChapters } from "@/lib/read-state";
import { clearProgress, getProgress, saveProgress } from "@/lib/progress";
import { estimateChapterSeconds, formatEta, useSecPerPage } from "@/lib/eta";
import type { Chapter } from "@/lib/mangadex";

type VolumeGroup = { volume: string | null; chapters: Chapter[] };

const VOLUME_BATCH = 6;

type MangaChapterListProps = {
  mangaId: string;
  mangaTitle: string;
  coverUrl?: string | null;
  alternateIds?: (string | null | undefined)[];
  volumes: VolumeGroup[];
};

function chapterLabel(chapter: Chapter): string {
  if (chapter.title && chapter.chapter) return `${chapter.chapter}: ${chapter.title}`;
  if (chapter.chapter) return `Chapter ${chapter.chapter}`;
  if (chapter.title) return chapter.title;
  return "Chapter";
}

export function MangaChapterList({
  mangaId,
  mangaTitle,
  coverUrl,
  alternateIds,
  volumes,
}: MangaChapterListProps) {
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [revealedVolumes, setRevealedVolumes] = useState(VOLUME_BATCH);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const readChapters = useReadChapters(mangaId);
  const mangaRead = useMangaRead(mangaId);
  const secPerPage = useSecPerPage();

  const readingOrder = useMemo(
    () =>
      volumes
        .flatMap((volume) => volume.chapters)
        .map((chapter) => ({ id: chapter.id, label: chapterLabel(chapter) })),
    [volumes],
  );

  const orderedVolumes = useMemo(() => {
    const reversed =
      order === "newest"
        ? [...volumes]
            .reverse()
            .map((volume) => ({ ...volume, chapters: [...volume.chapters].reverse() }))
        : volumes;
    return reversed;
  }, [volumes, order]);

  const visibleVolumes = orderedVolumes.slice(0, revealedVolumes);
  const hasMore = revealedVolumes < orderedVolumes.length;

  const loadMore = () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRevealedVolumes((value) => value + VOLUME_BATCH);
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
  }, [hasMore, orderedVolumes.length, revealedVolumes]);

  const markEverythingRead = () => {
    const chapterIds = readingOrder.map((chapter) => chapter.id);
    if (!chapterIds.length) return;
    markAllRead(mangaId, chapterIds);
    markMangaRead(mangaId);
    for (const id of alternateIds ?? []) {
      if (id) markMangaRead(id);
    }
    const progress = getProgress(mangaId, alternateIds, mangaTitle);
    if (progress && progress.mangaId !== mangaId) clearProgress(progress.mangaId);
    const finalChapter = readingOrder[readingOrder.length - 1];
    if (finalChapter) {
      saveProgress({
        mangaId,
        chapterId: finalChapter.id,
        chapterLabel: finalChapter.label,
        mangaTitle,
        coverUrl,
        scrollFraction: 1,
        mangaFraction: 1,
        updatedAt: Date.now(),
      });
    }
  };

  return (
    <div className="space-y-4">
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
        <button type="button" onClick={markEverythingRead} className={chipButton}>
          Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {visibleVolumes.map(({ volume, chapters }) => (
          <div key={volume ?? "no-volume"}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {volume ? `Volume ${volume}` : "Unvolumed"}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {chapters.map((chapter) => {
                const isRead = readChapters.has(chapter.id);
                return (
                <div
                  key={chapter.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 backdrop-blur-xl transition-colors duration-200 hover:border-white/25"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold group-hover:text-white ${
                        isRead ? "text-zinc-500" : "text-zinc-200"
                      }`}
                    >
                      {chapterLabel(chapter)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {chapter.pages > 0
                        ? `${chapter.pages} ${chapter.pages === 1 ? "page" : "pages"} · ~${formatEta(estimateChapterSeconds(chapter.pages, secPerPage))}`
                        : null}
                      {chapter.publishedAt
                        ? `${chapter.pages > 0 ? " · " : ""}${new Date(chapter.publishedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isRead && !mangaRead && (
                      <MarkReadButton
                        mangaId={mangaId}
                        mangaTitle={mangaTitle}
                        coverUrl={coverUrl}
                        alternateIds={alternateIds}
                        chapters={readingOrder}
                        chapterId={chapter.id}
                      />
                    )}
                    <ChapterReadCheck mangaId={mangaId} chapterId={chapter.id} />
                    {chapter.externalUrl ? (
                      <a
                        href={chapter.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={chipButton}
                      >
                        External
                      </a>
                    ) : (
                      <Link
                        href={`/read/${mangaId}/${chapter.id}`}
                        prefetch={false}
                        className={chipButton}
                      >
                        Read
                      </Link>
                    )}
                  </div>
                </div>
                );
                })}
            </div>
          </div>
        ))}
      </div>

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
        <p className="mt-6 text-center text-sm text-zinc-500">
          All {orderedVolumes.reduce((sum, v) => sum + v.chapters.length, 0)}{" "}
          chapters loaded.
        </p>
      )}
    </div>
  );
}
