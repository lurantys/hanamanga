"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { chaptersOfScanlator } from "@/lib/atsu";
import { usePreferredScanlator } from "@/lib/scanlator-preference";
import { getProgress, PROGRESS_EVENT, invalidateProgressCache } from "@/lib/progress";
import { BookOpenIcon } from "./icons";
import { ctaPrimary } from "@/lib/ui";

type ReadNowButtonProps = {
  mangaId: string;
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
  scanlators,
  chapters,
  defaultScanlatorId,
}: ReadNowButtonProps) {
  const preferred = usePreferredScanlator(mangaId);
  const progress = useSyncExternalStore(subscribeProgress, () => getProgress(mangaId), () => null);
  const selected = scanlators.some((scanlator) => scanlator.id === preferred)
    ? (preferred ?? "")
    : (defaultScanlatorId ?? scanlators[0]?.id ?? "");
  const group = chaptersOfScanlator(chapters, selected);
  let target = group[0] ?? chapters[0] ?? null;
  // If user has progress, honor it — continue from last read chapter (or next)
  if (progress && target) {
    const progressInGroup = group.find((c) => c.id === progress.chapterId);
    if (progressInGroup) {
      target = progressInGroup;
    } else {
      const anyProgress = chapters.find((c) => c.id === progress.chapterId);
      if (anyProgress) target = anyProgress;
    }
  }
  if (!target) return null;

  const isContinue = Boolean(progress && progress.chapterId === target.id);

  return (
    <Link
      href={`/read/${mangaId}/${target.id}`}
      className={ctaPrimary}
    >
      <BookOpenIcon />
      {isContinue ? "Continue" : "Read Now"}
    </Link>
  );
}