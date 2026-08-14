"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getLibrarySnapshot,
  removeFromLibrary,
  subscribeLibrary,
} from "@/lib/library";
import { getAllProgress } from "@/lib/progress";
import { statusLabel } from "@/lib/mangadex";

const EMPTY_LIBRARY_SNAPSHOT = {};

function getServerSnapshot(): ReturnType<typeof getLibrarySnapshot> {
  return EMPTY_LIBRARY_SNAPSHOT;
}

function thumbUrl(coverUrl?: string | null): string | null {
  return coverUrl?.replace(/\.512\.jpg$/, ".256.jpg") ?? coverUrl ?? null;
}

type SortKey = "added" | "updated" | "title";
type View = "grid" | "list";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "added", label: "Recently added" },
  { key: "updated", label: "Recently read" },
  { key: "title", label: "Title A-Z" },
];

function GridCard({
  title,
  coverUrl,
  href,
  ariaLabel,
  progressPct,
  meta,
  onRemove,
}: {
  title: string;
  coverUrl?: string | null;
  href: string;
  ariaLabel: string;
  progressPct: number | null;
  meta: string;
  onRemove: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label={ariaLabel}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[1.03]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 12vw"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-zinc-500">
              {title}
            </span>
          )}

          {progressPct !== null && (
            <span className="absolute left-1 top-1 rounded bg-zinc-950/80 px-1 py-0.5 text-[10px] font-semibold text-white">
              {progressPct}%
            </span>
          )}

          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-coarse:opacity-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                fill="white"
                stroke="none"
                className="ml-0.5 h-3 w-3"
              >
                <path d="M8 5.14v13.72L19 12 8 5.14z" />
              </svg>
            </span>
          </span>

          {progressPct !== null && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
              <div
                className="h-full bg-red-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${title} from library`}
        className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-zinc-950/80 text-zinc-300 opacity-0 transition-all duration-200 hover:border-red-400/50 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2.5 w-2.5"
          aria-hidden
        >
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>

      <div className="mt-1 px-0.5">
        <p className="line-clamp-1 text-xs font-semibold text-zinc-200">
          {title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{meta}</p>
      </div>
    </div>
  );
}

function ListCard({
  title,
  coverUrl,
  href,
  ariaLabel,
  progressPct,
  meta,
  onRemove,
}: {
  title: string;
  coverUrl?: string | null;
  href: string;
  ariaLabel: string;
  progressPct: number | null;
  meta: string;
  onRemove: () => void;
}) {
  return (
    <div className="group relative flex items-center gap-3.5 rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 transition-colors hover:border-white/20 hover:bg-zinc-900/80">
      <Link
        href={href}
        className="block shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label={ariaLabel}
      >
        <div className="relative h-[74px] w-[50px] overflow-hidden rounded-md bg-zinc-800">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill sizes="50px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-zinc-500">
              {title}
            </span>
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={href} className="block focus:outline-none">
          <p className="line-clamp-1 text-sm font-semibold text-zinc-200">
            {title}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{meta}</p>
        </Link>
        {progressPct !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-zinc-400">
              {progressPct}%
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${title} from library`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
    </div>
  );
}

export default function LibraryPage() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    getServerSnapshot,
  );
  const entries = useMemo(
    () => Object.values(library).sort((a, b) => b.addedAt - a.addedAt),
    [library],
  );
  const progress = getAllProgress();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [view, setView] = useState<View>("grid");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = entries.filter(({ manga }) =>
      term ? manga.title.toLowerCase().includes(term) : true,
    );
    switch (sort) {
      case "added":
        return list;
      case "updated":
        return [...list].sort(
          (a, b) =>
            (progress[b.manga.id]?.updatedAt ?? 0) -
            (progress[a.manga.id]?.updatedAt ?? 0),
        );
      case "title":
        return [...list].sort((a, b) =>
          a.manga.title.localeCompare(b.manga.title),
        );
    }
  }, [entries, query, sort, progress]);

  const toolbarVisible = entries.length > 0;

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Library
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {entries.length === 0
              ? "Manga you save will show up here."
              : "All the manga you're following, in one place."}
          </p>
        </header>
      </div>

      {toolbarVisible && (
        <div className="flex flex-wrap items-center gap-3 px-5 md:px-10">
          <div className="relative min-w-0 flex-1 basis-56">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your library..."
              aria-label="Search your library"
              className="w-full appearance-none rounded-full border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors placeholder:text-zinc-500 hover:border-white/25 focus:border-emerald-400/50"
            />
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort library"
              className="appearance-none rounded-full border border-white/10 bg-zinc-900/60 py-2.5 pl-4 pr-9 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors hover:border-white/25 focus:border-emerald-400/50"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <div className="flex gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-[0.95] ${
                view === "grid"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-[0.95] ${
                view === "list"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M8 6h13M8 12h13M8 18h13" />
                <path d="M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 px-5 md:px-10">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-20 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-zinc-600"
              aria-hidden
            >
              <path d="M4 4v16l8-4 8 4V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
            </svg>
            <p className="text-sm text-zinc-400">
              Your library is empty. Open any manga and hit{" "}
              <span className="font-semibold text-zinc-200">
                Add to Library
              </span>{" "}
              to keep track of it here.
            </p>
            <Link
              href="/browse"
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
            >
              Browse manga
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-zinc-600"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-sm text-zinc-400">
              No titles match{" "}
              <span className="font-semibold text-zinc-200">
                &ldquo;{query}&rdquo;
              </span>
              .
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm font-semibold text-zinc-200 underline-offset-4 hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
            {filtered.map(({ manga, addedAt }) => {
              const mangaProgress = progress[manga.id];
              const pct = mangaProgress
                ? Math.round(
                    (mangaProgress.mangaFraction ??
                      mangaProgress.scrollFraction) * 100,
                  )
                : null;
              return (
                <GridCard
                  key={manga.id}
                  title={manga.title}
                  coverUrl={thumbUrl(manga.coverUrl)}
                  href={
                    mangaProgress
                      ? `/read/${manga.id}/${mangaProgress.chapterId}`
                      : `/manga/${manga.id}`
                  }
                  ariaLabel={
                    mangaProgress
                      ? `${manga.title} — continue from ${mangaProgress.chapterLabel}, ${pct}% read`
                      : manga.title
                  }
                  progressPct={pct}
                  meta={
                    mangaProgress
                      ? `Continue · ${mangaProgress.chapterLabel}`
                      : `Added ${new Date(addedAt).toLocaleDateString()}`
                  }
                  onRemove={() => removeFromLibrary(manga.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(({ manga, addedAt }) => {
              const mangaProgress = progress[manga.id];
              const pct = mangaProgress
                ? Math.round(
                    (mangaProgress.mangaFraction ??
                      mangaProgress.scrollFraction) * 100,
                  )
                : null;
              const metaBits = [
                mangaProgress
                  ? `Continue · ${mangaProgress.chapterLabel}`
                  : `Added ${new Date(addedAt).toLocaleDateString()}`,
              ];
              const status = statusLabel(manga.status);
              if (status) metaBits.push(status);
              if (manga.year) metaBits.push(String(manga.year));
              return (
                <ListCard
                  key={manga.id}
                  title={manga.title}
                  coverUrl={thumbUrl(manga.coverUrl)}
                  href={
                    mangaProgress
                      ? `/read/${manga.id}/${mangaProgress.chapterId}`
                      : `/manga/${manga.id}`
                  }
                  ariaLabel={
                    mangaProgress
                      ? `${manga.title} — continue from ${mangaProgress.chapterLabel}, ${pct}% read`
                      : manga.title
                  }
                  progressPct={pct}
                  meta={metaBits.join(" · ")}
                  onRemove={() => removeFromLibrary(manga.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}