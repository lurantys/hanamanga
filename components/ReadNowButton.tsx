"use client";

import Link from "next/link";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { chaptersOfScanlator } from "@/lib/atsu";
import { usePreferredScanlator } from "@/lib/scanlator-preference";
import { BookOpenIcon } from "./icons";
import { ctaPrimary } from "@/lib/ui";

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
      className={ctaPrimary}
    >
      <BookOpenIcon />
      Read Now
    </Link>
  );
}