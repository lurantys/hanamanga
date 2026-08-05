"use client";

import { useWip } from "./WipProvider";

type ChapterReadButtonProps = {
  label: string;
  className?: string;
};

export function ChapterReadButton({ label, className = "" }: ChapterReadButtonProps) {
  const { openWip } = useWip();

  return (
    <button
      type="button"
      onClick={() => openWip()}
      className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-emerald-400/40 hover:bg-zinc-700/60 hover:text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      {label}
    </button>
  );
}
