"use client";

import Link from "next/link";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { chaptersOfScanlator } from "@/lib/atsu";
import { usePreferredScanlator } from "@/lib/scanlator-preference";

type ReadNowButtonProps = {
  mangaId: string;
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  defaultScanlatorId?: string | null;
};

export function ReadNowButton({
  mangaId,
  scanlators,
  chapters,
  defaultScanlatorId,
}: ReadNowButtonProps) {
  const preferred = usePreferredScanlator(mangaId);
  const selected = scanlators.some((scanlator) => scanlator.id === preferred)
    ? (preferred ?? "")
    : (defaultScanlatorId ?? scanlators[0]?.id ?? "");
  const group = chaptersOfScanlator(chapters, selected);
  const target = group[0] ?? chapters[0] ?? null;
  if (!target) return null;

  return (
    <Link
      href={`/read/${mangaId}/${target.id}`}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      Read Now
    </Link>
  );
}