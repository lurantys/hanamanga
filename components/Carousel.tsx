"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function ChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

type CarouselProps = {
  title: string;
  ariaLabel: string;
  children: ReactNode;
  headerRight?: ReactNode;
};

export function Carousel({ title, ariaLabel, children, headerRight }: CarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  };

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section aria-label={ariaLabel}>
      <div className="mb-3 flex items-center justify-between px-4 md:px-10">
        <h2 className="text-lg font-bold tracking-tight text-zinc-100">{title}</h2>
        <div className="flex items-center gap-2">
          {headerRight}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900/70 text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-25"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900/70 text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-25"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex touch-pan-x gap-3 overflow-x-auto px-4 py-2 md:px-10"
      >
        {children}
      </div>
    </section>
  );
}
