"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { focusRing } from "@/lib/ui";
import {
  getLibrarySnapshot,
  subscribeLibrary,
} from "@/lib/library";
import { getFinishedSnapshot, subscribeFinished } from "@/lib/read-state";
import { getAllProgress, subscribeProgress } from "@/lib/progress";

const EMPTY_LIBRARY_SNAPSHOT = {};
const EMPTY_FINISHED_SNAPSHOT: Record<string, number> = {};
const EMPTY_PROGRESS_SNAPSHOT: ReturnType<typeof getAllProgress> = {};

function getServerSnapshot(): ReturnType<typeof getLibrarySnapshot> {
  return EMPTY_LIBRARY_SNAPSHOT;
}

export function LibraryRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    getServerSnapshot,
  );
  const finished = useSyncExternalStore(subscribeFinished, getFinishedSnapshot, () => EMPTY_FINISHED_SNAPSHOT);
  const progress = useSyncExternalStore(subscribeProgress, getAllProgress, () => EMPTY_PROGRESS_SNAPSHOT);
  const entries = useMemo(
    () => Object.values(library).sort((a, b) => b.addedAt - a.addedAt),
    [library],
  );
  const [shuffleKey, setShuffleKey] = useState(0);
  useEffect(() => setShuffleKey(Date.now()), []);
  const toRead = useMemo(() => {
    return entries
      .filter((entry) => entry.status
        ? entry.status === "to_read"
        : !finished[entry.manga.id] && !progress[entry.manga.id])
      .map((entry) => ({ entry, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .map(({ entry }) => entry);
  // Shuffle once per page visit; library changes still refresh the row.
  }, [entries, finished, progress, shuffleKey]);

  if (toRead.length === 0) return null;

  return (
    <Carousel
      title="To Read"
      ariaLabel="To Read"
      headerRight={
        <Link
          href="/library"
          aria-label="View your library"
          className={`rounded text-xs font-semibold text-zinc-400 transition-colors duration-200 hover:text-white ${focusRing}`}
        >
          View all
        </Link>
      }
    >
      {toRead.map((entry) => (
        <MangaCard key={entry.manga.id} manga={entry.manga} />
      ))}
    </Carousel>
  );
}
