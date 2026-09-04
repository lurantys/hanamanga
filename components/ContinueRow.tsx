"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { focusRing } from "@/lib/ui";
import {
  CONTINUE_HERO_EVENT,
  PROGRESS_EVENT,
  getContinueList,
  clearProgress,
  invalidateProgressCache,
  type ProgressEntry,
} from "@/lib/progress";
import type { Manga } from "@/lib/mangadex";
import { fetchJsonCached } from "@/lib/api-fetch";
import { getFinishedSnapshot, subscribeFinished } from "@/lib/read-state";

const EMPTY_LIST: ProgressEntry[] = [];
const EMPTY_FINISHED: Record<string, number> = {};

function subscribe(onChange: () => void): () => void {
  const listener = () => onChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === "hana:progress") invalidateProgressCache();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONTINUE_HERO_EVENT, listener);
  window.addEventListener(PROGRESS_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONTINUE_HERO_EVENT, listener);
    window.removeEventListener(PROGRESS_EVENT, listener);
  };
}

export function ContinueRow() {
  const entries = useSyncExternalStore(
    subscribe,
    () => getContinueList(18),
    () => EMPTY_LIST,
  );
  const finished = useSyncExternalStore(
    subscribeFinished,
    getFinishedSnapshot,
    () => EMPTY_FINISHED,
  );
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !finished[entry.mangaId]),
    [entries, finished],
  );
  const [mangaById, setMangaById] = useState<Record<string, Manga>>({});

  useEffect(() => {
    if (!visibleEntries.length) return;
    const ids = visibleEntries.map((entry) => entry.mangaId).join(",");
    let active = true;
    fetchJsonCached<{ data?: Manga[] }>(
      `/api/manga?ids=${encodeURIComponent(ids)}`,
    )
      .then((json) => {
        if (!active || !json?.data) return;
        const byId = Object.fromEntries(
          (json.data as Manga[]).map((manga) => [manga.id, manga]),
        );
        setMangaById(byId);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visibleEntries]);

  if (!visibleEntries.length) return null;

  return (
    <Carousel title="Continue Reading" ariaLabel="Continue Reading">
      {visibleEntries.map((entry) => {
        const manga = mangaById[entry.mangaId];
        const title = manga?.title ?? entry.mangaTitle;
        const coverUrl = entry.coverUrl ?? manga?.coverUrl;
        const pct = Math.round(
          (entry.mangaFraction ?? entry.scrollFraction) * 100,
        );
        return (
          <MangaCard
            key={entry.mangaId}
            manga={{
              id: entry.mangaId,
              title,
              coverUrl: coverUrl ?? null,
              genres: [],
            }}
            href={`/read/${entry.mangaId}/${entry.chapterId}`}
            ariaLabel={`${title} — ${entry.chapterLabel}, ${pct}% of the manga read. Continue reading.`}
            subtitle={
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                {entry.chapterLabel}
              </p>
            }
            coverExtra={
              <>
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 rounded-md bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                >
                  {pct}%
                </span>
                <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/10">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            }
            actions={
              <button
                type="button"
                aria-label={`Remove ${title} from Continue Reading`}
                title="Remove from Continue Reading"
                onClick={() => clearProgress(entry.mangaId)}
                className={`continue-remove pointer-events-auto absolute left-1.5 top-1.5 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-zinc-950/80 text-zinc-300 shadow-lg transition-all duration-200 hover:border-white/40 hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:group-hover:z-50 md:group-focus-within:z-50 pointer-coarse:opacity-100 ${focusRing}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-2.5 w-2.5"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            }
          />
        );
      })}
    </Carousel>
  );
}
