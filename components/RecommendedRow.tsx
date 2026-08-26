"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { getAllProgress } from "@/lib/progress";
import { loadUserManga } from "@/lib/userManga";
import type { Manga } from "@/lib/mangadex";

const EMPTY_LIBRARY = {} as Record<string, never>;

const DAY = 86_400_000;

function recencyWeight(updatedAt?: number): number {
  if (!updatedAt) return 0.5;
  const age = Date.now() - updatedAt;
  if (age <= 7 * DAY) return 1;
  if (age <= 30 * DAY) return 0.8;
  if (age <= 90 * DAY) return 0.55;
  return 0.3;
}

export function RecommendedRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    () => EMPTY_LIBRARY,
  );
  const [manga, setManga] = useState<Manga[]>([]);
  const [prevLibrary, setPrevLibrary] = useState(library);

  if (prevLibrary !== library) {
    setPrevLibrary(library);
    setManga([]);
  }

  useEffect(() => {
    let active = true;
    loadUserManga()
      .then((userManga) => {
        if (!active) return;
        const exclude = new Set(userManga.map((item) => item.id));
        const progress = getAllProgress();
        const genreWeights = new Map<string, number>();

        for (const item of userManga) {
          const entry = progress[item.id];
          const depth =
            entry
              ? 0.4 +
                0.6 *
                  (entry.mangaFraction ?? entry.scrollFraction ?? 0)
              : 0.25;
          const recency = recencyWeight(entry?.updatedAt);
          const weight = depth * recency;
          for (const genre of item.genres ?? []) {
            if (!genre) continue;
            genreWeights.set(
              genre,
              (genreWeights.get(genre) ?? 0) + weight,
            );
          }
        }

        const tags = [...genreWeights.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([genre, weight]) => `${genre}:${weight.toFixed(2)}`);
        if (!tags.length) return;
        const key = tags.join(",") + "|" + [...exclude].sort().join(",");
        let h = 0;
        for (let i = 0; i < key.length; i++) {
          h = ((h << 5) - h + key.charCodeAt(i)) | 0;
        }
        const params = new URLSearchParams({
          tags: tags.join(","),
          exclude: [...exclude].join(","),
          limit: "18",
          seed: String(Math.abs(h) % 1_000_000),
        });
        return fetch(`/api/recommend?${params.toString()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (!active) return;
            const data: Manga[] = json?.data ?? [];
            if (data.length) setManga(data);
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [library]);

  if (manga.length === 0) return null;

  return (
    <Carousel title="Recommended for You" ariaLabel="Recommended for You">
      {manga.map((item) => (
        <MangaCard key={item.id} manga={item} />
      ))}
    </Carousel>
  );
}