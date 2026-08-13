"use client";

import { useEffect } from "react";
import type { Manga } from "@/lib/mangadex";

type WipModalProps = {
  open: boolean;
  media?: Manga | null;
  onClose: () => void;
};

export function WipModal({ open, media, onClose }: WipModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = media?.title ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manga reader work in progress"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition active:scale-95 hover:bg-zinc-800 hover:text-zinc-100"
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
              <p className="text-sm font-medium text-emerald-400">Queued: {title}</p>
            )}
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
              We couldn&apos;t find readable chapters for this title on any
              connected source. It may not have an English release yet — try
              another series.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-zinc-950 transition active:scale-[0.97] hover:bg-emerald-400"
            >
              Back to Catalog
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-200 transition active:scale-[0.97] hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
