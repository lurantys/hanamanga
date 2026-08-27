"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  GENRES,
  MIN_SCORE_OPTIONS,
  ORIGIN_OPTIONS,
  RATING_OPTIONS,
  SORTS,
  STATUS_OPTIONS,
  type SortKey,
} from "@/lib/genres";
import { selectField, focusRing } from "@/lib/ui";

type BrowseFiltersProps = {
  sort: SortKey;
  genres: string[];
  status?: string;
  rating?: string;
  origin?: string;
  yearFrom?: string;
  yearTo?: string;
  minScore?: string;
};

function hrefFor({
  sort,
  genres,
  status,
  rating,
  origin,
  yearFrom,
  yearTo,
  minScore,
}: {
  sort: string;
  genres: string[];
  status?: string;
  rating?: string;
  origin?: string;
  yearFrom?: string;
  yearTo?: string;
  minScore?: string;
}) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (genres.length) params.set("genres", genres.join(","));
  if (status) params.set("status", status);
  if (rating) params.set("rating", rating);
  if (origin) params.set("origin", origin);
  if (yearFrom) params.set("yearFrom", yearFrom);
  if (yearTo) params.set("yearTo", yearTo);
  if (minScore) params.set("minScore", minScore);
  return `/browse?${params.toString()}`;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={`${selectField} py-2 pl-4 pr-9 ${focusRing}`}
      >
        {options.map((option) => (
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
  );
}

function FilterSectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      {children}
    </p>
  );
}

function YearInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [draft, setDraft] = useState(value ?? "");

  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value ?? "");
  }

  const commit = () => {
    if (draft === "" || /^\d{4}$/.test(draft)) {
      onChange(draft);
    } else {
      setDraft(value ?? "");
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      event.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      min={1900}
      max={2100}
      inputMode="numeric"
      maxLength={4}
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={commit}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-24 rounded-lg border border-white/10 bg-zinc-900/60 py-2 pl-3 pr-2 text-[16px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-red-400/50 sm:text-sm"
    />
  );
}

export function BrowseFilters({
  sort,
  genres,
  status,
  rating,
  origin,
  yearFrom,
  yearTo,
  minScore,
}: BrowseFiltersProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [drawerOpen]);

  const base = { sort, genres, status, rating, origin, yearFrom, yearTo, minScore };

  const push = (patch: Partial<typeof base>) => {
    const next = { ...base, ...patch };
    router.push(hrefFor(next));
  };

  const activeFilterCount =
    genres.length +
    (status ? 1 : 0) +
    (rating ? 1 : 0) +
    (origin ? 1 : 0) +
    (yearFrom || yearTo ? 1 : 0) +
    (minScore ? 1 : 0);

  const toggleGenre = (name: string) => {
    push({
      genres: genres.includes(name)
        ? genres.filter((value) => value !== name)
        : [...genres, name],
    });
  };

  const clearAll = () => {
    router.push(`/browse?sort=${sort}`);
  };

  const originLabel = ORIGIN_OPTIONS.find((option) => option.key === origin)?.label;
  const minScoreLabel = MIN_SCORE_OPTIONS.find(
    (option) => option.key === minScore,
  )?.label;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
          {SORTS.map((option) => (
            <Link
              key={option.key}
              href={hrefFor({ ...base, sort: option.key })}
              prefetch={false}
              aria-current={sort === option.key ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
                sort === option.key
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <Select
          label="Filter by status"
          value={status ?? ""}
          options={STATUS_OPTIONS}
          onChange={(value) => push({ status: value })}
        />

        <Select
          label="Filter by content rating"
          value={rating ?? ""}
          options={RATING_OPTIONS}
          onChange={(value) => push({ rating: value })}
        />

        <button
          type="button"
          onClick={() => setDrawerOpen((value) => !value)}
          aria-expanded={drawerOpen}
          aria-controls="browse-filters-panel"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.97] ${
            activeFilterCount > 0 || drawerOpen
              ? "border-red-400/60 bg-red-500/15 text-red-300"
              : "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-white/25"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-[11px] font-bold text-zinc-950">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {drawerOpen && (
        <div
          id="browse-filters-panel"
          ref={panelRef}
          role="region"
          aria-label="Advanced filters"
          tabIndex={-1}
          className="glass-in rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 backdrop-blur-xl outline-none"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <FilterSectionLabel>
                Genres — match all selected
              </FilterSectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((genre) => {
                  const selected = genres.includes(genre.name);
                  return (
                    <button
                      key={genre.name}
                      type="button"
                      onClick={() => toggleGenre(genre.name)}
                      aria-pressed={selected}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                        selected
                          ? "border-red-400/60 bg-red-500/15 text-red-300"
                          : "border-white/10 bg-zinc-800/60 text-zinc-400 hover:text-white"
                      } ${focusRing}`}
                    >
                      {genre.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Titles must match every selected genre.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <FilterSectionLabel>Origin / type</FilterSectionLabel>
                <Select
                  label="Filter by origin"
                  value={origin ?? ""}
                  options={ORIGIN_OPTIONS}
                  onChange={(value) => push({ origin: value })}
                />
              </div>

              <div>
                <FilterSectionLabel>Release year</FilterSectionLabel>
                <div className="flex items-center gap-2">
                  <YearInput
                    key={`from-${yearFrom ?? ""}`}
                    value={yearFrom}
                    onChange={(value) => push({ yearFrom: value })}
                    placeholder="From"
                    ariaLabel="Release year from"
                  />
                  <span className="text-xs text-zinc-500">to</span>
                  <YearInput
                    key={`to-${yearTo ?? ""}`}
                    value={yearTo}
                    onChange={(value) => push({ yearTo: value })}
                    placeholder="To"
                    ariaLabel="Release year to"
                  />
                </div>
              </div>

              <div>
                <FilterSectionLabel>Minimum score</FilterSectionLabel>
                <Select
                  label="Filter by minimum score"
                  value={minScore ?? ""}
                  options={MIN_SCORE_OPTIONS}
                  onChange={(value) => push({ minScore: value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500">
              {activeFilterCount > 0
                ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
                : "No active filters"}
            </p>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className={`rounded-lg border border-white/10 bg-zinc-800/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:border-red-400/40 hover:text-white ${focusRing}`}
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className={`rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors duration-200 hover:bg-white ${focusRing}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {(genres.length > 0 || origin || yearFrom || yearTo || minScore) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              aria-label={`Remove genre ${genre}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:text-white"
            >
              {genre}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
          {origin && (
            <button
              type="button"
              onClick={() => push({ origin: "" })}
              aria-label="Remove origin filter"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:text-white"
            >
              {originLabel ?? origin}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
          {(yearFrom || yearTo) && (
            <button
              type="button"
              onClick={() => push({ yearFrom: "", yearTo: "" })}
              aria-label="Remove year range filter"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:text-white"
            >
              {yearFrom ? yearFrom : "…"}–{yearTo ? yearTo : "…"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
          {minScore && (
            <button
              type="button"
              onClick={() => push({ minScore: "" })}
              aria-label="Remove minimum score filter"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:text-white"
            >
              {minScoreLabel ?? minScore}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
