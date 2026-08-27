"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GENRES } from "@/lib/genres";
import { popoverSurface, focusRing } from "@/lib/ui";

export function GenreMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const selectGenre = (genre: string) => {
    setOpen(false);
    router.push(`/browse?genres=${encodeURIComponent(genre)}`);
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`relative flex items-center gap-1.5 transition-colors duration-200 hover:text-white after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-red-500 after:transition-transform after:duration-200 hover:after:scale-x-100 ${focusRing}`}
      >
        Genre
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`${popoverSurface} absolute left-1/2 top-full z-50 mt-3 w-72 overflow-hidden p-4`}
        >
          <div className="-translate-x-1/2 relative left-1/2 w-72">
            <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Browse genres
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre.name}
                  type="button"
                  role="menuitem"
                  onClick={() => selectGenre(genre.name)}
                  className={`rounded-full border border-white/10 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors duration-200 hover:border-red-400/40 hover:bg-zinc-700/60 hover:text-white ${focusRing}`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
