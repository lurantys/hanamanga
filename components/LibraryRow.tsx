"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { MangaCard } from "./MangaCard";
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
    <section aria-label="Your Library">
      <div className="mb-3 flex items-center justify-between px-4 md:px-10">
        <h2 className="text-lg font-bold tracking-tight text-zinc-100">
          Your Library
        </h2>
        <Link
          href="/library"
          className="text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          View all
        </Link>
      </div>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 py-2 md:px-10">
        {entries.map((entry) => (
          <MangaCard key={entry.manga.id} manga={entry.manga} />
        ))}
      </div>
    </section>
  );
}
