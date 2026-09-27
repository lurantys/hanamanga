"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { getReadSnapshot } from "@/lib/read-state";
import { loadUserManga } from "@/lib/userManga";
import { fetchJsonCached } from "@/lib/api-fetch";
import type { Chapter, Manga } from "@/lib/mangadex";

const EMPTY_LIBRARY = {} as Record<string, never>;
const FOURTEEN_DAYS = 14 * 86_400_000;
type ChapterUpdate = { manga: Manga; publishedAt: number };

export function NewChaptersRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    () => EMPTY_LIBRARY,
  );
  const [updates, setUpdates] = useState<Manga[]>([]);

  useEffect(() => {
    let active = true;
    const cutoff = Date.now() - FOURTEEN_DAYS;

    loadUserManga()
      .then(async (mangaList) => {
        if (!active || !mangaList.length) return;
        const mangaListForRequest = mangaList.slice(0, 100);
        const feedBatches = await Promise.all(
          Array.from(
            { length: Math.ceil(mangaListForRequest.length / 30) },
            (_, index) => mangaListForRequest.slice(index * 30, (index + 1) * 30),
          ).map((batch) =>
            fetchJsonCached<{ data?: Record<string, Chapter[]> }>(
              `/api/feed?ids=${batch
                .map((manga) => encodeURIComponent(manga.id))
                .join(",")}&limit=5`,
            ),
          ),
        );
        if (!active) return;
        const read = getReadSnapshot();
        const feedMap = Object.assign({}, ...feedBatches.map((json) => json?.data ?? {}));
        const results: ChapterUpdate[] = [];

        for (const manga of mangaListForRequest) {
          const readSet = read[manga.id];
          const recent = (feedMap[manga.id] ?? [])
            .filter((chapter) => {
              const published = Date.parse(chapter.publishedAt ?? "");
              return (
                Number.isFinite(published) &&
                published >= cutoff &&
                published <= Date.now() &&
                !readSet?.[chapter.id]
              );
            })
            .sort(
              (a, b) =>
                Date.parse(b.publishedAt ?? "") -
                Date.parse(a.publishedAt ?? ""),
            );

          if (!recent.length) continue;
          results.push({
            manga: {
              ...manga,
              latestChapter: recent[0].chapter ?? manga.latestChapter,
            },
            publishedAt: Date.parse(recent[0].publishedAt ?? ""),
          });
        }

        results.sort((a, b) => b.publishedAt - a.publishedAt);
        setUpdates(results.map((result) => result.manga));
      })
      .catch(() => {
        if (active) setUpdates([]);
      });

    return () => {
      active = false;
    };
  }, [library]);

  if (!updates.length) return null;

  return (
    <Carousel title="New Chapters" ariaLabel="New Chapters">
      {updates.map((manga) => (
        <MangaCard key={manga.id} manga={manga} />
      ))}
    </Carousel>
  );
}
