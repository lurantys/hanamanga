"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChapterReadCheck } from "./ChapterReadCheck";
import { LoadingIcon } from "./LoadingIcon";
import type { Chapter } from "@/lib/mangadex";

type VolumeGroup = { volume: string | null; chapters: Chapter[] };

const VOLUME_BATCH = 6;

type MangaChapterListProps = {
  mangaId: string;
  volumes: VolumeGroup[];
};

function chapterLabel(chapter: Chapter): string {
  if (chapter.title && chapter.chapter) return `${chapter.chapter}: ${chapter.title}`;
  if (chapter.chapter) return `Chapter ${chapter.chapter}`;
  if (chapter.title) return chapter.title;
  return "Chapter";
}

export function MangaChapterList({ mangaId, volumes }: MangaChapterListProps) {
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [revealedVolumes, setRevealedVolumes] = useState(VOLUME_BATCH);
  const [jump, setJump] = useState("");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

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
        setRevealedVolumes(Math.max(revealedVolumes, i + 1));
        setScrollTarget(orderedVolumes[i].chapters[index].id);
        return;
      }
    }
  };

  const startFromBeginning = () => {
    if (!firstChapterId) return;
    setOrder("oldest");
    setRevealedVolumes(VOLUME_BATCH);
    setScrollTarget(firstChapterId);
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

      <div className="flex flex-col gap-8">
        {visibleVolumes.map(({ volume, chapters }) => (
          <div key={volume ?? "no-volume"}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-400">
              {volume ? `Volume ${volume}` : "Unvolumed"}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  ref={(el) => {
                    itemRefs.current[chapter.id] = el;
                  }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 backdrop-blur-xl transition-colors hover:border-white/25"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-200">
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
                    <ChapterReadCheck mangaId={mangaId} chapterId={chapter.id} />
                    {chapter.externalUrl ? (
                      <a
                        href={chapter.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700/60 hover:text-white"
                      >
                        External
                      </a>
                    ) : (
                      <Link
                        href={`/read/${mangaId}/${chapter.id}`}
                        className="rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700/60 hover:text-white"
                      >
                        Read
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="mt-6 flex items-center justify-center">
          <LoadingIcon className="h-8 w-8" />
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
