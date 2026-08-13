"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import {
  CONTINUE_HERO_EVENT,
  PROGRESS_EVENT,
  getContinueList,
  type ProgressEntry,
} from "@/lib/progress";
import type { Manga } from "@/lib/mangadex";

const EMPTY_LIST: ProgressEntry[] = [];

function subscribe(onChange: () => void): () => void {
  const listener = () => onChange();
  window.addEventListener("storage", listener);
  window.addEventListener(CONTINUE_HERO_EVENT, listener);
  window.addEventListener(PROGRESS_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
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
  const [mangaById, setMangaById] = useState<Record<string, Manga>>({});

  useEffect(() => {
    if (!entries.length) return;
    const ids = entries.map((entry) => entry.mangaId).join(",");
    let active = true;
    fetch(`/api/manga?ids=${encodeURIComponent(ids)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
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
  }, [entries]);

  if (!entries.length) return null;

  return (
    <Carousel title="Continue Reading" ariaLabel="Continue Reading">
      {entries.map((entry) => {
        const manga = mangaById[entry.mangaId];
        const title = manga?.title ?? entry.mangaTitle;
        const coverUrl = entry.coverUrl ?? manga?.coverUrl;
        const pct = Math.round(
          (entry.mangaFraction ?? entry.scrollFraction) * 100,
        );
        return (
          <Link
            key={entry.mangaId}
            href={`/read/${entry.mangaId}/${entry.chapterId}`}
            aria-label={`${title} — ${entry.chapterLabel}, ${pct}% of the manga read. Continue reading.`}
            className="group w-36 shrink-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:w-44"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[1.03]">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 144px, 176px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-zinc-500">
                  {title}
                </span>
              )}
              <span className="absolute right-1.5 top-1.5 rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {pct}%
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="mt-2 px-0.5">
              <p className="line-clamp-1 text-sm font-semibold text-zinc-200">
                {title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                {entry.chapterLabel}
              </p>
            </div>
          </Link>
        );
      })}
    </Carousel>
  );
}
