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
  const [state, setState] = useState<"loading" | "done" | "empty">("loading");

  useEffect(() => {
    const continueEntries = getContinueList(50);
    if (!continueEntries.length) {
      setState("empty");
      return;
    }

    const baseline = new Map<string, number>();
    for (const entry of continueEntries) {
      baseline.set(entry.mangaId, entry.updatedAt ?? 0);
    }
    const read = getReadSnapshot();
    const ids = continueEntries.map((entry) => entry.mangaId);

    let active = true;
    setState("loading");
    fetch(`/api/manga?ids=${ids.join(",")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const mangaList: Manga[] = json?.data ?? [];
        const byId = new Map(mangaList.map((manga) => [manga.id, manga]));
        return Promise.all(
          continueEntries.map(async (entry) => {
            const manga = byId.get(entry.mangaId);
            if (!manga) return null;
            const readSet = read[entry.mangaId];
            const since = baseline.get(entry.mangaId) ?? 0;
            try {
              const res = await fetch(
                `/api/feed?mangaId=${encodeURIComponent(entry.mangaId)}&limit=3`,
              );
              if (!res.ok) return null;
              const json = await res.json();
              const chapters: Chapter[] = json?.data ?? [];
              const fresh = chapters.filter((chapter) => {
                const published = Date.parse(chapter.publishedAt ?? "");
                if (!Number.isFinite(published) || published <= since) return false;
                if (readSet && readSet[chapter.id]) return false;
                return true;
              });
              if (!fresh.length) return null;
              fresh.sort(
                (a, b) =>
                  Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""),
              );
              return { manga, latest: fresh[0] };
            } catch {
              return null;
            }
          }),
        );
      })
      .then((results) => {
        if (!active || !results) return;
        const list = results.filter((value): value is Update => value !== null);
        if (!list.length) {
          setState("empty");
          return;
        }
        list.sort(
          (a, b) =>
            Date.parse(b.latest.publishedAt ?? "") -
            Date.parse(a.latest.publishedAt ?? ""),
        );
        setUpdates(list);
        setState("done");
      })
      .catch(() => {
        if (active) setState("empty");
      });

    return () => {
      active = false;
    };
  }, [library]);

  if (state === "empty") return null;

  return (
    <Carousel title="New Chapters" ariaLabel="New chapters">
      {updates.map((update) => (
        <MangaCard key={update.manga.id} manga={update.manga} />
      ))}
    </Carousel>
  );
}
