"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { getContinueList } from "@/lib/progress";
import { getReadSnapshot } from "@/lib/read-state";
import type { Chapter, Manga } from "@/lib/mangadex";

const EMPTY_LIBRARY = {} as Record<string, never>;

type Update = { manga: Manga; latest: Chapter };

export function NewChaptersRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    () => EMPTY_LIBRARY,
  );
  const [updates, setUpdates] = useState<Update[]>([]);
  const [prevLibrary, setPrevLibrary] = useState(library);

  if (prevLibrary !== library) {
    setPrevLibrary(library);
    setUpdates([]);
  }

  useEffect(() => {
    const continueEntries = getContinueList(20);
    if (!continueEntries.length) return;

    const baseline = new Map<string, number>();
    for (const entry of continueEntries) {
      baseline.set(entry.mangaId, entry.updatedAt ?? 0);
    }
    const read = getReadSnapshot();
    const ids = continueEntries.map((entry) => entry.mangaId);

    let active = true;
    Promise.all([
      fetch(`/api/manga?ids=${ids.join(",")}`).then((res) =>
        res.ok ? res.json() : null,
      ),
      fetch(
        `/api/feed?ids=${ids.map(encodeURIComponent).join(",")}&limit=3`,
      ).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([mangaJson, feedJson]) => {
        if (!active) return;
        const mangaList: Manga[] = mangaJson?.data ?? [];
        const byId = new Map(mangaList.map((manga) => [manga.id, manga]));
        const feedMap: Record<string, Chapter[]> = feedJson?.data ?? {};
        const results: Update[] = [];
        for (const entry of continueEntries) {
          const manga = byId.get(entry.mangaId);
          if (!manga) continue;
          const readSet = read[entry.mangaId];
          const since = baseline.get(entry.mangaId) ?? 0;
          const chapters = feedMap[entry.mangaId] ?? [];
          const fresh = chapters.filter((chapter) => {
            const published = Date.parse(chapter.publishedAt ?? "");
            if (!Number.isFinite(published) || published <= since) return false;
            if (readSet && readSet[chapter.id]) return false;
            return true;
          });
          if (!fresh.length) continue;
          fresh.sort(
            (a, b) =>
              Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""),
          );
          results.push({ manga, latest: fresh[0] });
        }
        return results;
      })
      .then((list) => {
        if (!active || !list) return;
        if (!list.length) return;
        list.sort(
          (a, b) =>
            Date.parse(b.latest.publishedAt ?? "") -
            Date.parse(a.latest.publishedAt ?? ""),
        );
        setUpdates(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [library]);

  if (updates.length === 0) return null;

  return (
    <Carousel title="New Chapters" ariaLabel="New Chapters">
      {updates.map((update) => (
        <MangaCard key={update.manga.id} manga={update.manga} />
      ))}
    </Carousel>
  );
}