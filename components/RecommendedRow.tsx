"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { getContinueList } from "@/lib/progress";
import type { Manga } from "@/lib/mangadex";

const EMPTY_LIBRARY = {} as Record<string, never>;

export function RecommendedRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    () => EMPTY_LIBRARY,
  );
  const [manga, setManga] = useState<Manga[]>([]);
  const [state, setState] = useState<"loading" | "done" | "empty">("loading");

  useEffect(() => {
    const entries = Object.values(library);
    if (!entries.length) {
      setState("empty");
      return;
    }

    const counts = new Map<string, number>();
    const exclude = new Set<string>();
    for (const entry of entries) {
      exclude.add(entry.manga.id);
      for (const genre of entry.manga.genres ?? []) {
        if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1);
      }
    }
    for (const item of getContinueList(50)) exclude.add(item.mangaId);

    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([genre]) => genre);

    if (!tags.length) {
      setState("empty");
      return;
    }

    let active = true;
    setState("loading");
    const params = new URLSearchParams({
      tags: tags.join(","),
      exclude: [...exclude].join(","),
      limit: "18",
    });
    fetch(`/api/recommend?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const data: Manga[] = json?.data ?? [];
        if (!data.length) {
          setState("empty");
          return;
        }
        setManga(data);
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
    <Carousel title="Recommended for You" ariaLabel="Recommended for you">
      {manga.map((item) => (
        <MangaCard key={item.id} manga={item} />
      ))}
    </Carousel>
  );
}
