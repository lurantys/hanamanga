"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getLibrarySnapshot,
  isInLibrary,
  setLibraryStatus,
  subscribeLibrary,
  toggleLibrary,
  type LibraryStatus,
} from "@/lib/library";
import { getProgress, subscribeProgress } from "@/lib/progress";
import {
  getFinishedSnapshot,
  markMangaRead,
  markMangaUnread,
  subscribeFinished,
} from "@/lib/read-state";
import {
  ctaAccent,
  ctaSecondary,
  dropdownItem,
  dropdownItemDefault,
  dropdownItemSelected,
  popoverSurface,
} from "@/lib/ui";
import type { Manga } from "@/lib/mangadex";

type LibraryButtonProps = {
  manga: Manga;
  className?: string;
};

export function LibraryButton({ manga, className = "" }: LibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const saved = useSyncExternalStore(
    subscribeLibrary,
    () => isInLibrary(manga.id),
    () => false,
  );
  const entry = useSyncExternalStore(
    subscribeLibrary,
    () => getLibrarySnapshot()[manga.id],
    () => undefined,
  );
  const progress = useSyncExternalStore(
    subscribeProgress,
    () => getProgress(manga.id, undefined, manga.title),
    () => null,
  );
  const finished = useSyncExternalStore(
    subscribeFinished,
    () => Boolean(getFinishedSnapshot()[manga.id]),
    () => false,
  );
  const status: LibraryStatus = finished
    ? "read"
    : entry?.status ?? (progress ? "reading" : "to_read");

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

  function updateStatus(next: LibraryStatus) {
    if (next === "reading") return; // Reading is set by actual reader progress.
    if (!saved) toggleLibrary(manga);
    if (next === "read") {
      markMangaRead(manga.id);
      return;
    }
    if (finished) markMangaUnread(manga.id);
    setLibraryStatus(manga.id, "to_read");
  }

  const label = status === "read"
    ? "Finished"
    : status === "reading"
      ? "Reading"
      : saved
        ? "Want to Read"
        : "Add to List";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Reading list status for ${manga.title}: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${status === "to_read" && !saved ? ctaSecondary : ctaAccent} ${className}`}
      >
        {status === "read" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="m5 12 4 4L19 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M5 4v16l7-4 7 4V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
          </svg>
        )}
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-70" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.09 1.032l-4.25 4.5a.75.75 0 0 1-1.09 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={`${manga.title} reading list status`} className={`${popoverSurface} absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden p-1.5`}>
          <button
            type="button"
            role="menuitem"
            onClick={() => { updateStatus("to_read"); setOpen(false); }}
            className={`${dropdownItem} justify-between ${status === "to_read" ? dropdownItemSelected : dropdownItemDefault}`}
          >
            Want to Read
            {status === "to_read" && <span aria-hidden className="text-red-400">✓</span>}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { updateStatus("read"); setOpen(false); }}
            className={`${dropdownItem} justify-between ${status === "read" ? dropdownItemSelected : dropdownItemDefault}`}
          >
            Mark as Finished
            {status === "read" && <span aria-hidden className="text-red-400">✓</span>}
          </button>
          {status === "reading" && (
            <p className="border-t border-white/10 px-3 py-2 text-xs text-zinc-400">
              Reading · tracked from your chapter progress
            </p>
          )}
        </div>
      )}
    </div>
  );
}
