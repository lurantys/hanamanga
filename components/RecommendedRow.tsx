"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { loadUserManga } from "@/lib/userManga";
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
    let active = true;
    setState("loading");
    loadUserManga()
      .then((userManga) => {
        if (!active) return;
        const exclude = new Set(userManga.map((item) => item.id));
        const counts = new Map<string, number>();
        for (const item of userManga) {
          for (const genre of item.genres ?? []) {
            if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1);
          }
        }
        const tags = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([genre]) => genre);
        if (!tags.length) {
          setState("empty");
          return;
        }
        const params = new URLSearchParams({
          tags: tags.join(","),
          exclude: [...exclude].join(","),
          limit: "18",
        });
        return fetch(`/api/recommend?${params.toString()}`)
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
