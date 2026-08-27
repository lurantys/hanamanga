"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { chaptersOfScanlator } from "@/lib/atsu";
import { usePreferredScanlator } from "@/lib/scanlator-preference";
import { getProgress, PROGRESS_EVENT, invalidateProgressCache } from "@/lib/progress";
import { useMangaRead } from "@/lib/read-state";
import { BookOpenIcon } from "./icons";
import { ctaPrimary } from "@/lib/ui";

type ReadNowButtonProps = {
  mangaId: string;
  alternateIds?: (string | null | undefined)[];
  mangaTitle?: string | null;
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  defaultScanlatorId?: string | null;
};

function subscribeProgress(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === "hana:progress") invalidateProgressCache();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROGRESS_EVENT, onChange);
  };
}

export function ReadNowButton({
  mangaId,
  alternateIds,
  mangaTitle,
  scanlators,
  chapters,
  defaultScanlatorId,
}: ReadNowButtonProps) {
  const preferred = usePreferredScanlator(mangaId);
  const progress = useSyncExternalStore(
    subscribeProgress,
    () => getProgress(mangaId, alternateIds, mangaTitle),
    () => null,
  );
  const mangaRead = useMangaRead(mangaId);
  const selected = scanlators.some((scanlator) => scanlator.id === preferred)
    ? (preferred ?? "")
    : (defaultScanlatorId ?? scanlators[0]?.id ?? "");
  const group = chaptersOfScanlator(chapters, selected);
  let target = (mangaRead ? group[group.length - 1] : group[0]) ?? chapters[0] ?? null;
  // If user has progress, honor it — continue from last read chapter (or next)
  if (progress && !mangaRead) {
    const progressInGroup = group.find((c) => c.id === progress.chapterId);
    if (progressInGroup) {
      target = progressInGroup;
    } else {
      const anyProgress = chapters.find((c) => c.id === progress.chapterId);
      if (anyProgress) target = anyProgress;
    }
  }
  if (!target && !progress) return null;

  const isContinue = Boolean(progress && !mangaRead);
  const pct = progress && !mangaRead
    ? Math.round((progress.mangaFraction ?? progress.scrollFraction) * 100)
    : 0;

  const targetMangaId = isContinue ? progress?.mangaId || mangaId : mangaId;
  const targetChapterId = isContinue ? progress?.chapterId : target?.id;

  return (
    <Link
      href={`/read/${targetMangaId}/${targetChapterId}`}
      className={ctaPrimary}
    >
      <BookOpenIcon />
      <span className="flex flex-col items-start leading-tight">
        {isContinue ? "Continue" : "Read Now"}
        {isContinue && progress && (
          <span className="text-[11px] font-semibold text-zinc-500">
            {progress.chapterLabel}
            {pct > 0 ? ` · ${pct}%` : ""}
          </span>
        )}
      </span>
    </Link>
  );
}
