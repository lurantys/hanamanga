"use client";

import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { focusRing } from "@/lib/ui";

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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;

    // Always show the first card when a row mounts.
    el.scrollLeft = 0;

    const updateBoundaries = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        setAtStart((value) => {
          const next = el.scrollLeft <= 1;
          return value === next ? value : next;
        });
        setAtEnd((value) => {
          const next = el.scrollLeft >= max - 1;
          return value === next ? value : next;
        });
      });
    };

    updateBoundaries();
    el.addEventListener("scroll", updateBoundaries, { passive: true });
    const resizeObserver = new ResizeObserver(updateBoundaries);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", updateBoundaries);
      resizeObserver.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = el.scrollLeft;
    const scrollAmount = Math.round(el.clientWidth * 0.85);
    el.scrollBy({
      left: Math.max(-currentScroll, Math.min(dir * scrollAmount, maxScroll - currentScroll)),
      behavior: "smooth",
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  };

  return (
    <section aria-label={ariaLabel}>
      <div className="mb-3 flex items-center justify-between px-5 md:px-10">
        <h2 className="text-lg font-bold tracking-tight text-zinc-100">{title}</h2>
        <div className="flex items-center gap-2">
          {headerRight}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900/70 text-zinc-200 transition-colors duration-200 hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-25 ${focusRing}`}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900/70 text-zinc-200 transition-colors duration-200 hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-25 ${focusRing}`}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="carousel-scroller scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 py-2 scroll-px-5 md:px-10 md:py-10 md:scroll-px-10"
        onWheel={handleWheel}
        style={{ overscrollBehaviorX: "none" }}
      >
        {children}
      </div>
    </section>
  );
}
