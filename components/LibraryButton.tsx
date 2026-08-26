"use client";

import { useSyncExternalStore } from "react";
import {
  isInLibrary,
  subscribeLibrary,
  toggleLibrary,
} from "@/lib/library";
import { ctaPrimary, ctaSecondary } from "@/lib/ui";
import type { Manga } from "@/lib/mangadex";

type LibraryButtonProps = {
  manga: Manga;
  className?: string;
};

export function LibraryButton({ manga, className = "" }: LibraryButtonProps) {
  const saved = useSyncExternalStore(
    subscribeLibrary,
    () => isInLibrary(manga.id),
    () => false,
  );

  return (
    <button
      type="button"
      onClick={() => toggleLibrary(manga)}
      aria-pressed={saved}
      className={`${saved ? `${ctaPrimary} border border-transparent bg-red-500 text-zinc-950 hover:bg-red-400` : ctaSecondary} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M4 4v16l8-4 8 4V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
      </svg>
      {saved ? "In Library" : "Add to Library"}
    </button>
  );
}
