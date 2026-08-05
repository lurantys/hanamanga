"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AtsuChapter, AtsuScanlator } from "@/lib/atsu";
import { atsuChapterLabel } from "@/lib/atsu";

type AtsuChapterListProps = {
  mangaId: string;
  scanlators: AtsuScanlator[];
  chapters: AtsuChapter[];
  defaultScanlatorId?: string | null;
};

export function AtsuChapterList({
  mangaId,
  scanlators,
  chapters,
  defaultScanlatorId,
}: AtsuChapterListProps) {
  const [selected, setSelected] = useState(
    defaultScanlatorId ?? scanlators[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");

  const groupChapters = useMemo(
    () =>
      chapters
        .filter((chapter) => chapter.scanlationMangaId === selected)
        .sort((a, b) => a.index - b.index),
    [chapters, selected],
  );

  const visibleChapters = useMemo(() => {
    if (!query.trim()) return groupChapters;
    const needle = query.trim().toLowerCase();
    return groupChapters.filter((chapter) =>
      atsuChapterLabel(chapter).toLowerCase().includes(needle),
    );
  }, [groupChapters, query]);

  const hasMultipleScanlators = scanlators.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hasMultipleScanlators ? (
          <div className="flex flex-wrap gap-2">
            {scanlators.map((scanlator) => (
              <button
                key={scanlator.id}
                type="button"
                onClick={() => setSelected(scanlator.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selected === scanlator.id
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                {scanlator.name}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <label className="relative block sm:w-56">
          <span className="sr-only">Find a chapter</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Find chapter (${groupChapters.length} available)`}
            className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/50"
          />
        </label>
      </div>

      {visibleChapters.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-10 text-center">
          <p className="text-sm text-zinc-400">
            {query
              ? `No chapters match "${query}".`
              : "No chapters from this group."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleChapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/read/${mangaId}/${chapter.id}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 backdrop-blur-xl transition-colors hover:border-emerald-400/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-200 group-hover:text-white">
                  {atsuChapterLabel(chapter)}
                </p>
                <p className="text-xs text-zinc-500">
                  {chapter.pageCount} {chapter.pageCount === 1 ? "page" : "pages"}
                  {chapter.createdAt
                    ? ` · ${new Date(chapter.createdAt * 1000).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors group-hover:border-emerald-400/40 group-hover:bg-zinc-700/60 group-hover:text-white">
                Read
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
