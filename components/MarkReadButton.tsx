"use client";

import { CheckIcon } from "./icons";
import { clearProgress, getProgress, saveProgress } from "@/lib/progress";
import {
  markAllBeforeRead,
  markFinishedIfLastChapter,
} from "@/lib/read-state";
import { focusRing } from "@/lib/ui";

export type MarkReadChapter = {
  id: string;
  label: string;
};

type MarkReadButtonProps = {
  mangaId: string;
  mangaTitle: string;
  coverUrl?: string | null;
  alternateIds?: (string | null | undefined)[];
  chapters: MarkReadChapter[];
  chapterId: string;
};

export function MarkReadButton({
  mangaId,
  mangaTitle,
  coverUrl,
  alternateIds,
  chapters,
  chapterId,
}: MarkReadButtonProps) {
  const target = chapters.find((chapter) => chapter.id === chapterId);

  const markReadUpTo = () => {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    if (index === -1) return;
    markAllBeforeRead(mangaId, chapters, chapterId);
    markFinishedIfLastChapter(mangaId, chapterId, chapters);

    // Move the continue position to the chapter right after the marked one,
    // but never backwards past an existing reading position.
    const existing = getProgress(mangaId, alternateIds, mangaTitle);
    const existingIndex = existing
      ? chapters.findIndex((chapter) => chapter.id === existing.chapterId)
      : -1;
    if (existingIndex > index) return;
    const nextChapter = chapters[index + 1];
    const resume = nextChapter ?? chapters[index];
    if (existing && existing.mangaId !== mangaId) clearProgress(existing.mangaId);
    saveProgress({
      mangaId,
      chapterId: resume.id,
      chapterLabel: resume.label,
      mangaTitle,
      coverUrl,
      scrollFraction: nextChapter ? 0 : 1,
      mangaFraction: (index + 1) / chapters.length,
      updatedAt: Date.now(),
    });
  };

  return (
    <button
      type="button"
      title="Mark read up to here"
      aria-label={`Mark ${target?.label ?? "chapter"} and all previous chapters as read`}
      onClick={markReadUpTo}
      className={`pointer-events-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-zinc-500 transition duration-200 hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-400 active:scale-[0.97] ${focusRing}`}
    >
      <CheckIcon className="h-3.5 w-3.5" />
    </button>
  );
}
