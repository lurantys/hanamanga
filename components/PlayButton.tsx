"use client";

import { useWip } from "./WipProvider";
import type { Manga } from "@/lib/mangadex";

type PlayButtonProps = {
  manga: Manga;
  variant?: "read" | "info";
  className?: string;
};

export function PlayButton({
  manga,
  variant = "read",
  className = "",
}: PlayButtonProps) {
  const { openWip } = useWip();

  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

  if (variant === "info") {
    return (
      <button
        type="button"
        onClick={() => openWip(manga)}
        className={`${baseStyles} bg-zinc-500/50 text-white hover:bg-zinc-500/30 ${className}`}
      >
        <span aria-hidden>ℹ</span>
        More Info
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openWip(manga)}
      className={`${baseStyles} bg-white text-zinc-950 hover:bg-white/80 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      Read Now
    </button>
  );
}
