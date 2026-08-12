"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
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
    const entries = Object.values(library);
    if (!entries.length) {
      setState("empty");
      return;
    }

    const read = getReadSnapshot();
    const recent = entries.slice(0, 12);

    let active = true;
    setState("loading");
    Promise.all(
      recent.map(async (entry) => {
        const readSet = read[entry.manga.id];
        try {
          const res = await fetch(
            `/api/feed?mangaId=${encodeURIComponent(entry.manga.id)}&limit=1`,
          );
          if (!res.ok) return null;
          const json = await res.json();
          const latest: Chapter | undefined = json?.data?.[0];
          if (!latest) return null;
          if (readSet && readSet[latest.id]) return null;
          return { manga: entry.manga, latest };
        } catch {
          return null;
        }
      }),
    )
      .then((results) => {
        if (!active) return;
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
