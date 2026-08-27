"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChapterReadCheck } from "./ChapterReadCheck";
import { MarkReadButton } from "./MarkReadButton";
import { chipButton, focusRing, inputField } from "@/lib/ui";
import { useChapterFlash } from "@/lib/use-chapter-flash";
import { useMangaRead, useReadChapters } from "@/lib/read-state";
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
  const [jump, setJump] = useState("");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const { highlightId, flash } = useChapterFlash();

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const readChapters = useReadChapters(mangaId);
  const mangaRead = useMangaRead(mangaId);

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

  const firstChapterId = volumes[0]?.chapters[0]?.id ?? null;
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

  useEffect(() => {
    if (!scrollTarget) return;
    const el = itemRefs.current[scrollTarget];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollTarget, orderedVolumes]);

  const goToChapter = () => {
    const target = Number(jump.trim());
    if (!Number.isFinite(target)) return;
    for (let i = 0; i < orderedVolumes.length; i++) {
      const index = orderedVolumes[i].chapters.findIndex(
        (chapter) => parseFloat(chapter.chapter ?? "") === target,
      );
      if (index !== -1) {
        const chapterId = orderedVolumes[i].chapters[index].id;
        setRevealedVolumes(Math.max(revealedVolumes, i + 1));
        setScrollTarget(chapterId);
        flash(chapterId);
        return;
      }
    }
  };

  const startFromBeginning = () => {
    if (!firstChapterId) return;
    setOrder("oldest");
    setRevealedVolumes(VOLUME_BATCH);
    setScrollTarget(firstChapterId);
    flash(firstChapterId);
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
                  ref={(el) => {
                    itemRefs.current[chapter.id] = el;
                  }}
                  className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 ${
                  highlightId === chapter.id
                    ? "animate-chapter-highlight border-red-400/50 bg-red-500/20"
                    : "border-white/10 bg-zinc-900/60"
                }`}
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
                        ? `${chapter.pages} ${chapter.pages === 1 ? "page" : "pages"}`
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
