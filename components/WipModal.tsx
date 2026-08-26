"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Manga } from "@/lib/mangadex";
import { useDialogFocus } from "@/lib/use-dialog-focus";

type WipModalProps = {
  open: boolean;
  media?: Manga | null;
  onClose: () => void;
};

export function WipModal({ open, media, onClose }: WipModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const onBeforeUnload = () => {
      document.body.style.overflow = "";
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = media?.title ?? null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Manga reader work in progress"
      onClick={onClose}
      className="animate-sheet-fade-in fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-zinc-950/60"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-400">
            <span aria-hidden className="text-sm">🚧</span>
            Work In Progress
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800 text-4xl" aria-hidden>
            🚧
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">
              No chapters available
            </h3>
            {title && (
              <p className="text-sm font-medium text-red-300">Queued: {title}</p>
            )}
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
              We couldn&apos;t find readable chapters for this title on any
              connected source. It may not have an English release yet — try
              another series.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/browse"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition duration-200 hover:bg-white/80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Back to Catalog
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-zinc-800/60 px-6 py-2.5 text-sm font-semibold text-zinc-100 transition duration-200 hover:border-white/30 hover:bg-zinc-700/60 hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
