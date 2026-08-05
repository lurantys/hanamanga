"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProgress, saveContinueHero, saveProgress } from "@/lib/progress";

type ReaderPage = {
  id: string;
  image: string;
  width?: number;
  height?: number;
};

type ReaderChapter = {
  id: string;
  label: string;
};

type ReaderProps = {
  mangaId: string;
  mangaTitle: string;
  mangaHref: string;
  chapterLabel: string;
  chapterNumber?: number | null;
  currentChapterId: string;
  chapters: ReaderChapter[];
  pages: ReaderPage[];
  prevHref?: string | null;
  nextHref?: string | null;
};

function ChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const controlButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3.5 py-2 text-sm font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-zinc-800/80 hover:text-white";

const iconButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/70 text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-zinc-800/80 hover:text-white";

export function Reader({
  mangaId,
  mangaTitle,
  mangaHref,
  chapterLabel,
  chapterNumber,
  currentChapterId,
  chapters,
  pages,
  prevHref,
  nextHref,
}: ReaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let saveTimer = 0;
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const value = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(value);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const index = chapters.findIndex(
          (chapter) => chapter.id === currentChapterId,
        );
        const mangaFraction =
          index >= 0 && chapters.length > 0
            ? (index + value) / chapters.length
            : undefined;
        const entry = {
          mangaId,
          chapterId: currentChapterId,
          chapterLabel,
          mangaTitle,
          scrollFraction: value,
          mangaFraction,
          updatedAt: Date.now(),
        };
        saveProgress(entry);
        saveContinueHero({
          manga: {
            id: mangaId,
            title: mangaTitle,
            coverUrl: null,
            bannerUrl: null,
            genres: [],
            availableLanguages: [],
          },
          chapterId: currentChapterId,
          chapterLabel,
          scrollFraction: value,
          mangaFraction,
          updatedAt: entry.updatedAt,
        });
      }, 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(saveTimer);
    };
  }, [mangaId, currentChapterId, chapterLabel, mangaTitle, chapters]);

  useEffect(() => {
    const saved = getProgress(mangaId);
    if (!saved || saved.chapterId !== currentChapterId || !saved.scrollFraction) {
      return;
    }
    const restore = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max > 0) window.scrollTo(0, saved.scrollFraction * max);
    };
    restore();
    const onLoad = () => window.setTimeout(restore, 60);
    window.addEventListener("load", onLoad);
    const fallback = window.setTimeout(restore, 1200);
    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(fallback);
    };
  }, [mangaId, currentChapterId]);

  useEffect(() => {
    let raf = 0;
    function computeCurrentPage() {
      raf = 0;
      const threshold = window.scrollY + window.innerHeight * 0.35;
      let index = 0;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (el && el.offsetTop <= threshold) index = i;
      }
      setCurrentPage(index);
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(computeCurrentPage);
    }
    computeCurrentPage();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pages.length]);

  const chapterPrefix =
    chapterNumber !== null && chapterNumber !== undefined
      ? `Chapter ${chapterNumber}`
      : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && prevHref) router.push(prevHref);
      if (event.key === "ArrowRight" && nextHref) router.push(nextHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current
        .querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.08),transparent_55%)] pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-white/5">
          <div
            className="h-full bg-red-500 transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-3 sm:px-4">
          <Link
            href={mangaHref}
            aria-label={`Back to ${mangaTitle}`}
            className={iconButton}
          >
            <ChevronLeft />
          </Link>

          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-haspopup="listbox"
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">
                  {mangaTitle}
                </span>
                <span className="block truncate text-xs text-zinc-400">
                  {chapterLabel}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            </button>

            {open && (
              <>
                <button
                  type="button"
                  aria-label="Close chapter list"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setOpen(false)}
                />
                <div
                  ref={listRef}
                  className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-zinc-950/70 backdrop-blur-xl"
                >
                  {chapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={`/read/${mangaId}/${chapter.id}`}
                      data-active={chapter.id === currentChapterId}
                      onClick={() => setOpen(false)}
                      className={`block truncate rounded-lg px-3 py-2 text-sm transition-colors ${
                        chapter.id === currentChapterId
                          ? "bg-red-500/15 font-bold text-red-300"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {chapter.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {prevHref ? (
              <Link href={prevHref} aria-label="Previous chapter" title="Previous chapter" className={iconButton}>
                <ChevronLeft />
              </Link>
            ) : (
              <span className={`${iconButton} cursor-not-allowed opacity-40`}>
                <ChevronLeft />
              </span>
            )}
            {nextHref ? (
              <Link
                href={nextHref}
                aria-label="Next chapter"
                title="Next chapter"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 shadow-[0_8px_24px_rgba(220,38,38,0.25)] transition-colors hover:bg-red-500/25"
              >
                <ChevronRight />
              </Link>
            ) : (
              <span className={`${iconButton} cursor-not-allowed opacity-40`}>
                <ChevronRight />
              </span>
            )}
          </div>
        </div>
      </header>

      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 pt-5">
        <Link
          href={prevHref ?? mangaHref}
          aria-disabled={!prevHref}
          className={`${controlButton} ${
            prevHref ? "" : "pointer-events-none opacity-40"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
        <span className="hidden text-xs font-medium uppercase tracking-widest text-zinc-500 sm:block">
          {chapterPrefix ? `${chapterPrefix} · ` : ""}Page {currentPage + 1} of{" "}
          {pages.length} · use ← → keys
        </span>
        <Link
          href={nextHref ?? mangaHref}
          aria-disabled={!nextHref}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-300 shadow-[0_8px_24px_rgba(220,38,38,0.25)] transition-colors hover:bg-red-500/25 ${
            nextHref ? "" : "pointer-events-none opacity-40"
          }`}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>

      <div className="mx-auto mt-5 flex max-w-4xl flex-col gap-2 px-3 sm:px-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            ref={(el) => {
              pageRefs.current[index] = el;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.image}
              alt={`${chapterPrefix ? `${chapterPrefix} · ` : ""}Page ${index + 1}`}
              width={page.width ?? undefined}
              height={page.height ?? undefined}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className="h-auto w-full rounded-lg shadow-2xl shadow-zinc-950/60 ring-1 ring-white/5"
            />
          </div>
        ))}
      </div>

      <nav className="mx-auto mt-10 flex max-w-4xl items-center justify-between gap-2 px-4">
        <Link
          href={prevHref ?? mangaHref}
          aria-disabled={!prevHref}
          className={`${controlButton} ${
            prevHref ? "" : "pointer-events-none opacity-40"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
        <Link
          href={mangaHref}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3.5 py-2 text-sm font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-zinc-800/80 hover:text-white"
        >
          All Chapters
        </Link>
        <Link
          href={nextHref ?? mangaHref}
          aria-disabled={!nextHref}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-300 shadow-[0_8px_24px_rgba(220,38,38,0.25)] transition-colors hover:bg-red-500/25 ${
            nextHref ? "" : "pointer-events-none opacity-40"
          }`}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>
    </div>
  );
}
