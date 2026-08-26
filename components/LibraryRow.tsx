"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { focusRing } from "@/lib/ui";
import {
  getLibrarySnapshot,
  subscribeLibrary,
} from "@/lib/library";

const EMPTY_LIBRARY_SNAPSHOT = {};

function getServerSnapshot(): ReturnType<typeof getLibrarySnapshot> {
  return EMPTY_LIBRARY_SNAPSHOT;
}

export function LibraryRow() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    getServerSnapshot,
  );
  const entries = Object.values(library).sort((a, b) => b.addedAt - a.addedAt);

  if (entries.length === 0) return null;

  return (
    <Carousel
      title="Your Library"
      ariaLabel="Your Library"
      headerRight={
        <Link
          href="/library"
          aria-label="View all manga in your library"
          className={`rounded text-xs font-semibold text-zinc-400 transition-colors duration-200 hover:text-white ${focusRing}`}
        >
          View all
        </Link>
      }
    >
      {entries.map((entry) => (
        <MangaCard key={entry.manga.id} manga={entry.manga} />
      ))}
    </Carousel>
  );
}
