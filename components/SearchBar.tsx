"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const QUICK_SELECTS = ["Action", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Thriller"];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const goTo = (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    goTo(query);
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Search manga"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/60 text-zinc-200 transition-all duration-200 hover:border-white/25 hover:bg-zinc-800/80 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div className="glass-in absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/10 backdrop-blur-2xl sm:w-80">

          <form
            onSubmit={onSubmit}
            role="search"
            className="relative flex items-center"
          >
            <span className="pointer-events-none absolute left-3.5 flex h-4 w-4 items-center justify-center text-zinc-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search manga…"
              aria-label="Search manga"
              className="w-full rounded-full border border-white/10 bg-zinc-900/70 py-2.5 pl-10 pr-11 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-red-400/50"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 text-zinc-950 transition-colors hover:bg-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <div
            className="mt-4 border-t border-white/10 pt-4"
            role="group"
            aria-label="Quick picks"
          >
            <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Quick picks
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SELECTS.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => goTo(genre)}
                  className="rounded-full border border-white/10 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-red-400/40 hover:bg-zinc-700/60 hover:text-white"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
