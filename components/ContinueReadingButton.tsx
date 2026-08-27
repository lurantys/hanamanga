"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { PROGRESS_EVENT, getProgress, invalidateProgressCache } from "@/lib/progress";
import { BookOpenIcon } from "./icons";
import { ctaPrimary } from "@/lib/ui";

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
  alternateIds?: (string | null | undefined)[];
  mangaTitle?: string | null;
  children: ReactNode;
};

export function ContinueReadingButton({
  mangaId,
  alternateIds,
  mangaTitle,
  children,
}: ContinueReadingButtonProps) {
  const progress = useSyncExternalStore(
    subscribe,
    () => getProgress(mangaId, alternateIds, mangaTitle),
    () => null,
  );

  if (!progress) return <>{children}</>;

  // If progress points to a chapter that no longer exists (stale id), fall back to children (Read Now)
  // This prevents "always chapter 1" loop when progress id is mismatched due to scanlator switch.
  const pct = Math.round(
    (progress.mangaFraction ?? progress.scrollFraction) * 100,
  );

  const targetMangaId = progress.mangaId || mangaId;

  return (
    <Link
      href={`/read/${targetMangaId}/${progress.chapterId}`}
      aria-label={`${progress.mangaTitle} — continue from ${progress.chapterLabel}, ${pct}% of the manga read`}
      className={ctaPrimary}
    >
      <BookOpenIcon />
      <span className="flex flex-col items-start leading-tight">
        Continue
        <span className="text-[11px] font-semibold text-zinc-500">
          {progress.chapterLabel}
          {pct > 0 ? ` · ${pct}%` : ""}
        </span>
      </span>
    </Link>
  );
}