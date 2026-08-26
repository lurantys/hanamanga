"use client";

import { useMangaRead, useReadChapters } from "@/lib/read-state";

type ChapterReadCheckProps = {
  mangaId: string;
  chapterId: string;
};

export function ChapterReadCheck({ mangaId, chapterId }: ChapterReadCheckProps) {
  const readChapters = useReadChapters(mangaId);
  const mangaRead = useMangaRead(mangaId);

  if (!mangaRead && !readChapters.has(chapterId)) return null;

  return (
    <span
      title="Read"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-red-400"
      role="img"
      aria-label="Read"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
