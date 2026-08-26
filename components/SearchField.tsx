"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SearchIcon, CloseIcon } from "./icons";
import { focusRing } from "@/lib/ui";

export function SearchField({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex w-full items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-900/80 py-2.5 pl-4 pr-2 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-colors duration-200 focus-within:border-red-400/40"
    >
      <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search manga or author…"
        aria-label="Search manga"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 ${focusRing}`}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
