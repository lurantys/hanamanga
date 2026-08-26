"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  getLibrarySnapshot,
  removeFromLibrary,
  subscribeLibrary,
} from "@/lib/library";
import {
  getFinishedSnapshot,
  markMangaRead,
  markMangaUnread,
  subscribeFinished,
} from "@/lib/read-state";
import {
  clearProgress,
  getContinueList,
  getAllProgress,
  subscribeProgress,
  type ProgressEntry,
} from "@/lib/progress";
import { statusLabel } from "@/lib/mangadex";
import { popoverSurface, selectField, focusRing } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";

const EMPTY_LIBRARY_SNAPSHOT = {};

function getServerSnapshot(): ReturnType<typeof getLibrarySnapshot> {
  return EMPTY_LIBRARY_SNAPSHOT;
}

const EMPTY_FINISHED_SNAPSHOT: Record<string, number> = {};

function getFinishedServerSnapshot(): Record<string, number> {
  return EMPTY_FINISHED_SNAPSHOT;
}

const EMPTY_PROGRESS_SNAPSHOT: Record<string, ProgressEntry> = {};

function getProgressServerSnapshot(): Record<string, ProgressEntry> {
  return EMPTY_PROGRESS_SNAPSHOT;
}

const EMPTY_CONTINUE_SNAPSHOT: ProgressEntry[] = [];

function getContinueServerSnapshot(): ProgressEntry[] {
  return EMPTY_CONTINUE_SNAPSHOT;
}

function thumbUrl(coverUrl?: string | null): string | null {
  return coverUrl?.replace(/\.512\.jpg$/, ".256.jpg") ?? coverUrl ?? null;
}

type SortKey = "added" | "updated" | "title" | "rating" | "released";
type View = "grid" | "list";
type FilterKey = "all" | "reading" | "finished";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Library" },
  { key: "reading", label: "Reading" },
  { key: "finished", label: "Finished" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "added", label: "Recently added" },
  { key: "updated", label: "Recently read" },
  { key: "title", label: "Title A-Z" },
  { key: "rating", label: "Top rated" },
  { key: "released", label: "Newest releases" },
];

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EllipsisIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function CardMenu({
  title,
  isRead,
  onToggleRead,
  onRemove,
  removeLabel = "Remove from library",
  buttonClassName,
  iconClassName,
  wrapperClassName,
  revealOnHover,
}: {
  title: string;
  isRead: boolean;
  onToggleRead?: () => void;
  onRemove: () => void;
  removeLabel?: string;
  buttonClassName: string;
  iconClassName: string;
  wrapperClassName?: string;
  revealOnHover?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`${wrapperClassName ?? ""} ${
        revealOnHover && !open
          ? "opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName}
      >
        <EllipsisIcon className={iconClassName} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${title} actions`}
          className={`${popoverSurface} absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl p-1.5`}
        >
          {onToggleRead && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onToggleRead();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors duration-200 hover:bg-zinc-800/70 hover:text-white ${focusRing}`}
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-red-400" />
                {isRead ? "Mark as unread" : "Mark as read"}
              </button>
              <div role="separator" className="h-px bg-white/10" />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-200 ${focusRing}`}
          >
            <TrashIcon className="h-4 w-4 shrink-0" />
            {removeLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function GridCard({
  title,
  coverUrl,
  href,
  ariaLabel,
  progressPct,
  meta,
  isRead,
  onToggleRead,
  onRemove,
  removeLabel,
}: {
  title: string;
  coverUrl?: string | null;
  href: string;
  ariaLabel: string;
  progressPct: number | null;
  meta: string;
  isRead: boolean;
  onToggleRead?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        prefetch={false}
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

          {progressPct !== null && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
              <div
                className="h-full bg-red-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {isRead && (
            <span
              title="Finished"
              aria-label="Finished"
              className="absolute bottom-1.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <CheckIcon className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </Link>

      {onRemove && (
        <CardMenu
          title={title}
          isRead={isRead}
          onToggleRead={onToggleRead}
          onRemove={onRemove}
          removeLabel={removeLabel}
          wrapperClassName="absolute right-1 top-1 z-10"
          revealOnHover
          buttonClassName="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-zinc-950/80 text-zinc-300 transition-all duration-200 hover:border-white/40 hover:text-white"
          iconClassName="h-2.5 w-2.5"
        />
      )}

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
  isRead,
  onToggleRead,
  onRemove,
  removeLabel,
}: {
  title: string;
  coverUrl?: string | null;
  href: string;
  ariaLabel: string;
  progressPct: number | null;
  meta: string;
  isRead: boolean;
  onToggleRead?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="group relative flex items-center gap-3.5 rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 transition-colors hover:border-white/20 hover:bg-zinc-900/80">
      <Link
        href={href}
        prefetch={false}
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
        <Link href={href} prefetch={false} className="block focus:outline-none">
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

      {isRead && (
        <span
          title="Finished"
          aria-label="Finished"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
        >
          <CheckIcon className="h-3 w-3" />
        </span>
      )}

      {onRemove && (
        <CardMenu
          title={title}
          isRead={isRead}
          onToggleRead={onToggleRead}
          onRemove={onRemove}
          removeLabel={removeLabel}
          buttonClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/25 hover:bg-zinc-800 hover:text-white"
          iconClassName="h-4 w-4"
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    getServerSnapshot,
  );
  const finished = useSyncExternalStore(
    subscribeFinished,
    getFinishedSnapshot,
    getFinishedServerSnapshot,
  );
  const progress = useSyncExternalStore(
    subscribeProgress,
    getAllProgress,
    getProgressServerSnapshot,
  );
  const continueList = useSyncExternalStore(
    subscribeProgress,
    () => getContinueList(100),
    getContinueServerSnapshot,
  );
  const entries = useMemo(
    () => Object.values(library).sort((a, b) => b.addedAt - a.addedAt),
    [library],
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = entries.filter(({ manga }) => {
      if (term && !manga.title.toLowerCase().includes(term)) return false;
      const isRead = Boolean(finished[manga.id]);
      if (filter === "finished") return isRead;
      if (filter === "reading") return !isRead && Boolean(progress[manga.id]);
      return true;
    });
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
      case "rating":
        return [...list].sort(
          (a, b) => (b.manga.rating ?? 0) - (a.manga.rating ?? 0),
        );
      case "released":
        return [...list].sort((a, b) => {
          const aTime = Date.parse(a.manga.updatedAt ?? "") || 0;
          const bTime = Date.parse(b.manga.updatedAt ?? "") || 0;
          return bTime - aTime;
        });
    }
  }, [entries, query, sort, progress, finished, filter]);

  const extraReading = useMemo(
    () =>
      continueList.filter(
        (entry) => !library[entry.mangaId] && !finished[entry.mangaId],
      ),
    [continueList, library, finished],
  );

  const toolbarVisible = entries.length > 0 || extraReading.length > 0;

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
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
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="flex flex-wrap items-center gap-3">
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
              className="w-full appearance-none rounded-full border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors duration-200 placeholder:text-zinc-500 hover:border-white/25 focus:border-red-400/50"
            />
          </div>

          <div className="flex rounded-full border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                aria-label={`Show ${option.label.toLowerCase()} manga`}
                aria-pressed={filter === option.key}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 active:scale-[0.97] ${focusRing} ${
                  filter === option.key
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort library"
              className={`${selectField} py-2.5 pl-4 pr-9`}
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
              className={`flex h-8 w-8 items-center justify-center rounded-full transition duration-200 active:scale-[0.97] ${focusRing} ${
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
              className={`flex h-8 w-8 items-center justify-center rounded-full transition duration-200 active:scale-[0.97] ${focusRing} ${
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
        </div>
      )}

      <div className="mx-auto mt-8 max-w-7xl px-5 md:px-10">
        {entries.length === 0 && extraReading.length === 0 ? (
          <EmptyState
            art={
              <Image
                src="/pochitasleep.gif"
                alt="A sleepy dog, dozing off in an empty library"
                width={200}
                height={216}
                unoptimized
                className="h-40 w-auto rounded-2xl object-cover"
              />
            }
            title="Nothing saved yet"
            description={
              <>
                Open any manga and hit{" "}
                <span className="font-semibold text-zinc-200">
                  Add to Library
                </span>{" "}
                to keep track of it here.
              </>
            }
            action={
              <>
                <Link href="/browse" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Browse Catalog
                </Link>
                <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                    <path d="M3 9.5 12 3l9 6.5" />
                    <path d="M5 8.5V21h14V8.5" />
                  </svg>
                  Home
                </Link>
              </>
            }
          />
        ) : filtered.length === 0 && (filter !== "reading" || extraReading.length === 0) ? (
          query ? (
            <EmptyState
              art={
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
              }
              title="No matches"
              description={
                <>
                  No titles match{" "}
                  <span className="font-semibold text-zinc-200">
                    &ldquo;{query}&rdquo;
                  </span>
                  .
                </>
              }
              action={
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={`text-sm font-semibold text-zinc-200 underline-offset-4 hover:underline ${focusRing}`}
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <EmptyState
              art={
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
                  {filter === "finished" ? (
                    <path d="M20 6 9 17l-5-5" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </>
                  )}
                </svg>
              }
              title={
                filter === "finished"
                  ? "Nothing finished yet"
                  : filter === "reading"
                    ? "Nothing in progress"
                    : "Nothing here yet"
              }
              description={
                filter === "finished"
                  ? "Titles you mark as finished will show up here."
                  : filter === "reading"
                    ? "Open a chapter to start reading."
                    : undefined
              }
              action={
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`text-sm font-semibold text-zinc-200 underline-offset-4 hover:underline ${focusRing}`}
                >
                  Show all
                </button>
              }
            />
          )
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map(({ manga, addedAt }) => {
              const mangaProgress = progress[manga.id];
              const pct = mangaProgress
                ? Math.round(
                    (mangaProgress.mangaFraction ??
                      mangaProgress.scrollFraction) * 100,
                  )
                : null;
              const isRead = Boolean(finished[manga.id]);
              return (
                <GridCard
                  key={manga.id}
                  title={manga.title}
                  coverUrl={thumbUrl(manga.coverUrl)}
                  href={
                    isRead || !mangaProgress
                      ? `/manga/${manga.id}`
                      : `/read/${manga.id}/${mangaProgress.chapterId}`
                  }
                  ariaLabel={
                    isRead
                      ? `${manga.title} — finished`
                      : mangaProgress
                        ? `${manga.title} — continue from ${mangaProgress.chapterLabel}, ${pct}% read`
                        : manga.title
                  }
                  progressPct={pct}
                  meta={
                    isRead
                      ? "Finished"
                      : mangaProgress
                        ? `Continue · ${mangaProgress.chapterLabel}`
                        : `Added ${new Date(addedAt).toLocaleDateString()}`
                  }
                  isRead={isRead}
                  onToggleRead={() =>
                    isRead
                      ? markMangaUnread(manga.id)
                      : markMangaRead(manga.id)
                  }
                  onRemove={() => removeFromLibrary(manga.id)}
                />
              );
            })}
            {filter === "reading" &&
              extraReading.map((entry) => {
                const pct = Math.round(
                  (entry.mangaFraction ?? entry.scrollFraction) * 100,
                );
                return (
                  <GridCard
                    key={`continue-${entry.mangaId}`}
                    title={entry.mangaTitle}
                    coverUrl={thumbUrl(entry.coverUrl)}
                    href={`/read/${entry.mangaId}/${entry.chapterId}`}
                    ariaLabel={`${entry.mangaTitle} — continue from ${entry.chapterLabel}, ${pct}% read`}
                    progressPct={pct}
                    meta={`Continue · ${entry.chapterLabel}`}
                    isRead={false}
                    onRemove={() => clearProgress(entry.mangaId)}
                    removeLabel="Remove from Continue Reading"
                  />
                );
              })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(({ manga, addedAt }) => {
              const mangaProgress = progress[manga.id];
              const pct = mangaProgress
                ? Math.round(
                    (mangaProgress.mangaFraction ??
                      mangaProgress.scrollFraction) * 100,
                  )
                : null;
              const isRead = Boolean(finished[manga.id]);
              const metaBits = [
                isRead
                  ? "Finished"
                  : mangaProgress
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
                    isRead || !mangaProgress
                      ? `/manga/${manga.id}`
                      : `/read/${manga.id}/${mangaProgress.chapterId}`
                  }
                  ariaLabel={
                    isRead
                      ? `${manga.title} — finished`
                      : mangaProgress
                        ? `${manga.title} — continue from ${mangaProgress.chapterLabel}, ${pct}% read`
                        : manga.title
                  }
                  progressPct={pct}
                  meta={metaBits.join(" · ")}
                  isRead={isRead}
                  onToggleRead={() =>
                    isRead
                      ? markMangaUnread(manga.id)
                      : markMangaRead(manga.id)
                  }
                  onRemove={() => removeFromLibrary(manga.id)}
                />
              );
            })}
            {filter === "reading" &&
              extraReading.map((entry) => {
                const pct = Math.round(
                  (entry.mangaFraction ?? entry.scrollFraction) * 100,
                );
                return (
                  <ListCard
                    key={`continue-${entry.mangaId}`}
                    title={entry.mangaTitle}
                    coverUrl={thumbUrl(entry.coverUrl)}
                    href={`/read/${entry.mangaId}/${entry.chapterId}`}
                    ariaLabel={`${entry.mangaTitle} — continue from ${entry.chapterLabel}, ${pct}% read`}
                    progressPct={pct}
                    meta={`Continue · ${entry.chapterLabel}`}
                    isRead={false}
                    onRemove={() => clearProgress(entry.mangaId)}
                    removeLabel="Remove from Continue Reading"
                  />
                );
              })}
          </div>
        )}
      </div>
    </main>
  );
}
