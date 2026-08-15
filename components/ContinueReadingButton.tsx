"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { PROGRESS_EVENT, getProgress, invalidateProgressCache } from "@/lib/progress";

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "hana:progress") invalidateProgressCache();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROGRESS_EVENT, onChange);
  };
}

type ContinueReadingButtonProps = {
  mangaId: string;
  children: ReactNode;
};

export function ContinueReadingButton({
  mangaId,
  children,
}: ContinueReadingButtonProps) {
  const progress = useSyncExternalStore(
    subscribe,
    () => getProgress(mangaId),
    () => null,
  );

  if (!progress) return <>{children}</>;

  const pct = Math.round(
    (progress.mangaFraction ?? progress.scrollFraction) * 100,
  );

  return (
    <Link
      href={`/read/${mangaId}/${progress.chapterId}`}
      aria-label={`${progress.mangaTitle} — continue from ${progress.chapterLabel}, ${pct}% of the manga read.`}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      <span>
        Continue
        <span className="ml-1.5 text-xs font-semibold text-zinc-500">
          {progress.chapterLabel}
          {pct > 0 ? ` · ${pct}%` : ""}
        </span>
      </span>
    </Link>
  );
}