"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SearchLiveResults } from "./SearchLiveResults";
import { SearchIcon, CloseIcon } from "./icons";
import { popoverSurface, focusRing } from "@/lib/ui";

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
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
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
        <div className="search-expanded relative flex items-center">
          <form
            onSubmit={onSubmit}
            role="search"
            className="search-form flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-900/80 py-2 pl-3.5 pr-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-colors duration-200 focus-within:border-red-400/40"
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  const resultsEl = containerRef.current?.querySelector("#header-search-results");
                  const firstLink = resultsEl?.querySelector("a") as HTMLAnchorElement | null;
                  if (firstLink) {
                    event.preventDefault();
                    firstLink.focus();
                  }
                }
              }}
              placeholder="Search manga or author…"
              aria-label="Search manga"
              role="combobox"
              aria-expanded
              aria-controls="header-search-results"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-zinc-100 outline-none placeholder:text-zinc-500 sm:text-sm"
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
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 ${focusRing}`}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </form>

          {debouncedQuery && (
            <div
              id="header-search-results"
              className={`${popoverSurface} absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-4`}
            >
              <SearchLiveResults
                key={debouncedQuery}
                query={debouncedQuery}
                onPick={close}
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search manga"
          aria-haspopup="dialog"
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/60 text-zinc-200 transition-colors duration-200 hover:border-white/25 hover:bg-zinc-800/80 hover:text-white ${focusRing}`}
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
