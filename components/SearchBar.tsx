"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SearchLiveResults } from "./SearchLiveResults";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [open, query]);

  const goTo = (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return;
    close();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    goTo(query);
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {open ? (
        <form
          onSubmit={onSubmit}
          role="search"
          className="search-form search-expanded flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/80 py-2 pl-3.5 pr-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-colors focus-within:border-red-400/40"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search manga…"
            aria-label="Search manga"
            enterKeyHint="search"
            className="w-40 bg-transparent text-sm text-zinc-50 outline-none placeholder:text-zinc-500 sm:w-56 lg:w-64"
          />
          <button
            type="button"
            onClick={() => {
              if (query) {
                setQuery("");
                inputRef.current?.focus();
              } else {
                close();
              }
            }}
            aria-label={query ? "Clear search" : "Close search"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search manga"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/60 text-zinc-200 transition-all duration-200 hover:border-white/25 hover:bg-zinc-800/80 hover:text-white"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      )}

      {open && debouncedQuery && (
        <div className="glass-in absolute left-1/2 top-[calc(100%+12px)] z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/10 backdrop-blur-2xl">
          <SearchLiveResults
            key={debouncedQuery}
            query={debouncedQuery}
            onPick={close}
          />
        </div>
      )}
    </div>
  );
}