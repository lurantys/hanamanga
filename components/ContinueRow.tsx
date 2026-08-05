"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getContinueList, type ProgressEntry } from "@/lib/progress";
import type { Manga } from "@/lib/mangadex";

export function ContinueRow() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [mangaById, setMangaById] = useState<Record<string, Manga>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setEntries(getContinueList(18));
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!entries.length) return;
    const ids = entries.map((entry) => entry.mangaId).join(",");
    fetch(`/api/manga?ids=${encodeURIComponent(ids)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const byId = Object.fromEntries(
          (json.data as Manga[]).map((manga) => [manga.id, manga]),
        );
        setMangaById(byId);
      })
      .catch(() => {});
  }, [entries]);

  const items = entries
    .map((entry) => ({ entry, manga: mangaById[entry.mangaId] }))
    .filter(
      (item): item is { entry: ProgressEntry; manga: Manga } =>
        Boolean(item.manga),
    );

  if (!loaded || !items.length) return null;

  return (
    <section aria-label="Continue Reading">
      <h2 className="mb-3 px-4 text-lg font-bold tracking-tight text-zinc-100 md:px-10">
        Continue Reading
      </h2>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 py-2 md:px-10">
        {items.map(({ entry, manga }) => {
          const pct = Math.round(
            (entry.mangaFraction ?? entry.scrollFraction) * 100,
          );
          return (
            <Link
              key={entry.mangaId}
              href={`/read/${entry.mangaId}/${entry.chapterId}`}
              aria-label={`${manga.title} — ${entry.chapterLabel}, ${pct}% of the manga read. Continue reading.`}
              className="group w-36 shrink-0 text-left focus:outline-none md:w-44"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03]">
                {manga.coverUrl ? (
                  <Image
                    src={manga.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 144px, 176px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-zinc-500">
                    {manga.title}
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
                  {manga.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                  {entry.chapterLabel}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
