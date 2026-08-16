"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProgress,
  PROGRESS_EVENT,
  saveContinueHero,
  saveProgress,
} from "@/lib/progress";
import {
  DEFAULT_READER_SETTINGS,
  getReaderSettings,
  setReaderSettings,
  subscribeReaderSettings,
  type ReaderMode,
  type ReaderSettings,
} from "@/lib/reader-settings";
import {
  markChapterRead,
  useReadChapters,
} from "@/lib/read-state";
import type { ReaderProps } from "@/lib/reader-data";

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

function HomeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function BookOpenIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ZoomInIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function ZoomOutIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M8 11h6" />
    </svg>
  );
}

function FullscreenIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function MinimizeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ScrollIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PagedIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const controlButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3.5 py-2 text-sm font-semibold text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition active:scale-[0.97] hover:bg-zinc-800/80 hover:text-white";

const iconButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/70 text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition active:scale-[0.97] hover:bg-zinc-800/80 hover:text-white";

const railButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-200 transition active:scale-[0.95] hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40";

const mobileRailButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 transition active:scale-[0.95] hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/10 bg-zinc-950/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
            value === option.value
              ? "bg-zinc-100 text-zinc-950"
              : "text-zinc-300 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-1 text-left"
    >
      <span className="text-sm text-zinc-300">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-zinc-700"
        }`}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
        />
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      {children}
    </p>
  );
}

function ReaderImage({
  src,
  alt,
  className,
  style,
  width,
  height,
  loading = "lazy",
  placeholderClassName = "min-h-[50vh]",
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  placeholderClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      {!loaded && (
        <div
          className={`absolute inset-0 ${placeholderClassName} animate-pulse rounded-lg bg-zinc-900`}
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className ?? ""} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={style}
      />
    </div>
  );
}

export function Reader({
  mangaId,
  mangaTitle,
  mangaCoverUrl,
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
  const settings = useSyncExternalStore(
    subscribeReaderSettings,
    getReaderSettings,
    () => DEFAULT_READER_SETTINGS,
  );
  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setReaderSettings(patch);
  }, []);

  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pagedIndex, setPagedIndex] = useState(0);
  const [advanceCount, setAdvanceCount] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [preloadUrls, setPreloadUrls] = useState<string[]>([]);
  const readChapters = useReadChapters(mangaId);
  const [prevChapter, setPrevChapter] = useState<{
    mangaId: string;
    chapterId: string;
  } | null>(null);
  const lastRestoredAtRef = useRef(0);
  const chapterInitRef = useRef(false);

  if (
    prevChapter?.mangaId !== mangaId ||
    prevChapter?.chapterId !== currentChapterId
  ) {
    setPrevChapter({ mangaId, chapterId: currentChapterId });
    let initial = 0;
    const saved = getProgress(mangaId);
    if (
      saved?.chapterId === currentChapterId &&
      saved.scrollFraction &&
      pages.length > 0
    ) {
      initial = Math.min(
        pages.length - 1,
        Math.round(saved.scrollFraction * (pages.length - 1)),
      );
    }
    setPagedIndex(initial);
    setProgress(0);
  }

  useEffect(() => {
    const saved = getProgress(mangaId);
    lastRestoredAtRef.current = saved?.updatedAt ?? 0;
    chapterInitRef.current = false;
  }, [mangaId, currentChapterId]);

  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastZoomRef = useRef(settings.zoom);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const advanceTimerRef = useRef(0);
  const navigatingRef = useRef(false);
  const userActiveRef = useRef(false);
  const nextHrefRef = useRef<string | null | undefined>(nextHref);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingScrollTargetRef = useRef<number | null>(null);
  const controlsVisibleRef = useRef(true);
  const controlsTimerRef = useRef(0);

  const mode = settings.mode;

  const displayProgress =
    mode === "paged"
      ? pages.length > 0
        ? (pagedIndex + 1) / pages.length
        : 0
      : progress;

  const imageFilterCss = useMemo(() => {
    let css = `brightness(${settings.brightness})`;
    if (settings.filter === "sepia") css += " sepia(0.35)";
    return css;
  }, [settings.brightness, settings.filter]);

  useEffect(() => {
    nextHrefRef.current = nextHref;
  }, [nextHref]);

  useEffect(() => {
    navigatingRef.current = false;
  }, [currentChapterId]);

  useEffect(() => {
    const markActive = () => {
      userActiveRef.current = true;
    };
    window.addEventListener("wheel", markActive, { passive: true });
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    return () => {
      window.removeEventListener("wheel", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) window.clearInterval(advanceTimerRef.current);
      advanceTimerRef.current = 0;
    },
    [],
  );

  const stopAdvance = useCallback(() => {
    if (advanceTimerRef.current) {
      window.clearInterval(advanceTimerRef.current);
      advanceTimerRef.current = 0;
    }
    setAdvanceCount(null);
  }, []);

  const scheduleAdvance = useCallback(() => {
    if (advanceTimerRef.current || navigatingRef.current) return;
    const href = nextHrefRef.current;
    if (!href) return;
    let remaining = 3;
    setAdvanceCount(remaining);
    advanceTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopAdvance();
        navigatingRef.current = true;
        router.push(href);
      } else {
        setAdvanceCount(remaining);
      }
    }, 1000);
  }, [router, stopAdvance]);

  const setControls = useCallback((visible: boolean) => {
    controlsVisibleRef.current = visible;
    setControlsVisible(visible);
  }, []);

  const showControls = useCallback(() => {
    if (isMobile) {
      setControls(true);
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = window.setTimeout(() => setControls(false), 3500);
    }
  }, [isMobile, setControls]);

  useEffect(() => {
    if (mode !== "webtoon") return;
    let saveTimer = 0;
    function onScroll() {
      showControls();
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const value = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(value);
      if (value >= 0.95) markChapterRead(mangaId, currentChapterId);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        if (!userActiveRef.current) return;
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
          coverUrl: mangaCoverUrl,
          scrollFraction: value,
          mangaFraction,
          updatedAt: Date.now(),
        };
        saveProgress(entry);
        saveContinueHero({
          manga: {
            id: mangaId,
            title: mangaTitle,
            coverUrl: mangaCoverUrl,
            bannerUrl: null,
          },
          chapterId: currentChapterId,
          chapterLabel,
          scrollFraction: value,
          mangaFraction,
          updatedAt: entry.updatedAt,
        });
      }, 600);
      if (userActiveRef.current && value >= 0.98 && settings.autoAdvance) {
        scheduleAdvance();
      } else {
        stopAdvance();
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(saveTimer);
      stopAdvance();
    };
  }, [
    mangaId,
    currentChapterId,
    chapterLabel,
    mangaTitle,
    mangaCoverUrl,
    chapters,
    scheduleAdvance,
    stopAdvance,
    showControls,
    mode,
    settings.autoAdvance,
  ]);

  useEffect(() => {
    if (mode !== "paged") return;
    if (!chapterInitRef.current) {
      chapterInitRef.current = true;
      return;
    }
    const fraction = pages.length > 0 ? (pagedIndex + 1) / pages.length : 0;
    const index = chapters.findIndex(
      (chapter) => chapter.id === currentChapterId,
    );
    const mangaFraction =
      index >= 0 && chapters.length > 0
        ? (index + fraction) / chapters.length
        : undefined;
    const entry = {
      mangaId,
      chapterId: currentChapterId,
      chapterLabel,
      mangaTitle,
      coverUrl: mangaCoverUrl,
      scrollFraction: fraction,
      mangaFraction,
      updatedAt: Date.now(),
    };
    saveProgress(entry);
    saveContinueHero({
      manga: {
        id: mangaId,
        title: mangaTitle,
        coverUrl: mangaCoverUrl,
        bannerUrl: null,
      },
      chapterId: currentChapterId,
      chapterLabel,
      scrollFraction: fraction,
      mangaFraction,
      updatedAt: entry.updatedAt,
    });
    if (pagedIndex >= pages.length - 1) {
      markChapterRead(mangaId, currentChapterId);
    }
  }, [
    pagedIndex,
    pages.length,
    mode,
    mangaId,
    currentChapterId,
    chapterLabel,
    mangaTitle,
    mangaCoverUrl,
    chapters,
  ]);

  useEffect(() => {
    if (mode === "paged") return;
    const saved = getProgress(mangaId);
    if (!saved || saved.chapterId !== currentChapterId || !saved.scrollFraction) {
      return;
    }
    lastRestoredAtRef.current = saved.updatedAt;
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
  }, [mangaId, currentChapterId, mode]);

  useEffect(() => {
    const onProgress = () => {
      if (userActiveRef.current) return;
      const saved = getProgress(mangaId);
      if (
        !saved ||
        saved.chapterId !== currentChapterId ||
        !saved.scrollFraction
      ) {
        return;
      }
      if (saved.updatedAt <= lastRestoredAtRef.current) return;
      lastRestoredAtRef.current = saved.updatedAt;
      if (mode === "paged") {
        chapterInitRef.current = false;
        setPagedIndex(
          Math.min(
            pages.length - 1,
            Math.round(saved.scrollFraction * (pages.length - 1)),
          ),
        );
      } else {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        if (max > 0) window.scrollTo(0, saved.scrollFraction * max);
      }
    };
    window.addEventListener(PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(PROGRESS_EVENT, onProgress);
  }, [mode, mangaId, currentChapterId, pages.length]);

  useEffect(() => {
    if (mode !== "webtoon") return;
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
  }, [pages.length, mode]);

  useEffect(() => {
    if (mode !== "webtoon") return;
    const target = pendingScrollTargetRef.current;
    if (target == null) return;
    pendingScrollTargetRef.current = null;
    const raf = requestAnimationFrame(() => {
      const el = pageRefs.current[target];
      if (el) window.scrollTo(0, Math.max(0, el.offsetTop - 88));
    });
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const chapterPrefix =
    chapterNumber !== null && chapterNumber !== undefined
      ? `Chapter ${chapterNumber}`
      : null;

  const nextIndex = chapters.findIndex((chapter) => chapter.id === currentChapterId) + 1;
  const nextChapterLabel =
    nextIndex > 0 && nextIndex < chapters.length ? chapters[nextIndex].label : null;

  const switchMode = useCallback(
    (target: ReaderMode) => {
      if (target === mode) return;
      if (target === "paged") {
        setPagedIndex(currentPage);
        pendingScrollTargetRef.current = null;
        window.scrollTo(0, 0);
      } else {
        pendingScrollTargetRef.current = pagedIndex;
      }
      updateSettings({ mode: target });
    },
    [mode, currentPage, pagedIndex, updateSettings],
  );

  const toggleUi = useCallback(() => setUiHidden((value) => !value), []);

  const toggleControls = useCallback(() => {
    if (!isMobile) return;
    const next = !controlsVisibleRef.current;
    if (next) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = window.setTimeout(() => setControls(false), 3500);
    } else {
      window.clearTimeout(controlsTimerRef.current);
    }
    setControls(next);
  }, [isMobile, setControls]);

  const pageNext = useCallback(() => {
    if (pagedIndex < pages.length - 1) {
      setPagedIndex(pagedIndex + 1);
      showControls();
    } else if (nextHrefRef.current) {
      scheduleAdvance();
    }
  }, [pagedIndex, pages.length, scheduleAdvance, showControls]);

  const pagePrev = useCallback(() => {
    if (pagedIndex > 0) {
      setPagedIndex(pagedIndex - 1);
      showControls();
    } else if (prevHref) {
      router.push(prevHref);
    }
  }, [pagedIndex, prevHref, router, showControls]);

  const zoneNext = useCallback(() => {
    if (settings.direction === "rtl") pagePrev();
    else pageNext();
  }, [settings.direction, pagePrev, pageNext]);

  const zonePrev = useCallback(() => {
    if (settings.direction === "rtl") pageNext();
    else pagePrev();
  }, [settings.direction, pageNext, pagePrev]);

  const onTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) {
        if (settings.direction === "ltr") pageNext();
        else pagePrev();
      } else {
        if (settings.direction === "ltr") pagePrev();
        else pageNext();
      }
    },
    [settings.direction, pageNext, pagePrev],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (open) {
          setOpen(false);
          return;
        }
        toggleUi();
        return;
      }
      if (settingsOpen || open) return;
      if (mode === "paged") {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          if (settings.direction === "rtl") pageNext();
          else pagePrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          if (settings.direction === "rtl") pagePrev();
          else pageNext();
        } else if (event.key === " ") {
          event.preventDefault();
          pageNext();
        }
      } else {
        if (event.key === "ArrowLeft" && prevHref) router.push(prevHref);
        if (event.key === "ArrowRight" && nextHref) router.push(nextHref);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    router,
    prevHref,
    nextHref,
    mode,
    settings.direction,
    pageNext,
    pagePrev,
    settingsOpen,
    open,
    toggleUi,
  ]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current
        .querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: "center" });
    }
  }, [open]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [settingsOpen]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const zoomIn = useCallback(() => {
    const value = Math.min(2, Number((settings.zoom + 0.25).toFixed(2)));
    updateSettings({ zoom: value });
  }, [settings.zoom, updateSettings]);

  const zoomOut = useCallback(() => {
    const value = Math.max(0.5, Number((settings.zoom - 0.25).toFixed(2)));
    updateSettings({ zoom: value });
  }, [settings.zoom, updateSettings]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onViewportClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("button")) return;
      if (settings.tapZones) {
        const width = event.currentTarget.clientWidth;
        const x = event.clientX;
        if (x < width / 3 || x > (width * 2) / 3) return;
      }
      toggleControls();
    },
    [settings.tapZones, toggleControls],
  );

  useEffect(() => {
    if (!isMobile || settingsOpen || open || advanceCount !== null) return;
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => setControls(false), 3500);
  }, [isMobile, settingsOpen, open, advanceCount, setControls]);

  useEffect(() => {
    if (mode !== "webtoon") return;
    const prev = lastZoomRef.current;
    if (prev === settings.zoom) return;
    lastZoomRef.current = settings.zoom;
    const el = contentRef.current;
    if (!el) return;
    const ratio = settings.zoom / prev;
    const center = window.innerHeight / 2;
    const elTop = el.getBoundingClientRect().top + window.scrollY;
    const anchor = window.scrollY + center;
    const newAnchor = elTop + (anchor - elTop) * ratio;
    window.scrollTo(0, Math.max(0, newAnchor - center));
  }, [settings.zoom, mode]);

  const nextNextHref = useMemo(() => {
    const index = chapters.findIndex((chapter) => chapter.id === currentChapterId);
    if (index < 0 || index >= chapters.length - 2) return null;
    return `/read/${mangaId}/${chapters[index + 2].id}`;
  }, [chapters, currentChapterId, mangaId]);

  const nextChapterId = useMemo(() => {
    if (!nextHref) return null;
    const parts = nextHref.split("/");
    return parts[parts.length - 1] ?? null;
  }, [nextHref]);

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
    if (displayProgress > 0.6 && nextNextHref) router.prefetch(nextNextHref);
  }, [router, nextHref, nextNextHref, displayProgress]);

  useEffect(() => {
    if (!nextHref || !nextChapterId || preloadUrls.length > 0) return;
    const nearEnd =
      mode === "webtoon"
        ? displayProgress > 0.85
        : pagedIndex >= pages.length - 2;
    if (!nearEnd) return;
    let cancelled = false;
    fetch(
      `/api/preload-chapter?mangaId=${encodeURIComponent(mangaId)}&chapterId=${encodeURIComponent(nextChapterId)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.pages?.length) setPreloadUrls(data.pages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    mangaId,
    nextHref,
    nextChapterId,
    mode,
    displayProgress,
    pagedIndex,
    pages.length,
    preloadUrls.length,
  ]);

  const fitStyle =
    settings.fit === "height"
      ? {
          maxHeight: "calc(100dvh - 9rem)",
          maxWidth: "calc(100vw - 2rem)",
          width: "auto",
        }
      : {
          maxHeight: "calc(100dvh - 9rem)",
          maxWidth: "calc(100vw - 2rem)",
          width: "100%",
          height: "auto",
        };

  const renderControls = (buttonClass: string) => (
    <>
      <Link href="/" aria-label="Home" title="Home" className={buttonClass}>
        <HomeIcon />
      </Link>
      <Link
        href={mangaHref}
        aria-label="Manga details"
        title={mangaTitle}
        className={buttonClass}
      >
        <BookOpenIcon />
      </Link>
      <button
        type="button"
        onClick={() => {
          switchMode(mode === "webtoon" ? "paged" : "webtoon");
          showControls();
        }}
        aria-label={`Switch to ${mode === "webtoon" ? "paged" : "webtoon"} mode`}
        title={`Switch to ${mode === "webtoon" ? "paged" : "webtoon"} mode`}
        className={buttonClass}
      >
        {mode === "webtoon" ? <PagedIcon /> : <ScrollIcon />}
      </button>
      <button
        type="button"
        onClick={() => {
          zoomIn();
          showControls();
        }}
        aria-label="Zoom in"
        title="Zoom in"
        className={buttonClass}
      >
        <ZoomInIcon />
      </button>
      <button
        type="button"
        onClick={() => {
          zoomOut();
          showControls();
        }}
        aria-label="Zoom out"
        title="Zoom out"
        className={buttonClass}
      >
        <ZoomOutIcon />
      </button>
      <button
        type="button"
        onClick={() => {
          setSettingsOpen((value) => !value);
          showControls();
        }}
        aria-label="Reader settings"
        title="Reader settings"
        className={buttonClass}
      >
        <SettingsIcon />
      </button>
      <button
        type="button"
        onClick={() => {
          toggleFullscreen();
          showControls();
        }}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className={buttonClass}
      >
        {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {preloadUrls.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}

      <header className={`sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl transition-all duration-300 ${uiHidden ? "pointer-events-none -translate-y-full opacity-0" : ""}`}>
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-white/5">
          <div
            className="h-full bg-red-500 transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(displayProgress * 100)}%` }}
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
              onClick={() => {
                setOpen((value) => !value);
                setSettingsOpen(false);
              }}
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
                  {chapters.map((chapter) => {
                    const isActive = chapter.id === currentChapterId;
                    const isRead = readChapters.has(chapter.id);
                    return (
                      <Link
                        key={chapter.id}
                        href={`/read/${mangaId}/${chapter.id}`}
                        data-active={isActive}
                        onClick={() => setOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-red-500/15 font-bold text-red-300"
                            : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isRead && (
                            <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          )}
                          <span className="truncate">{chapter.label}</span>
                        </span>
                      </Link>
                    );
                  })}
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 transition active:scale-[0.97] hover:bg-red-500/25"
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

      {mode === "webtoon" ? (
        <>
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
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-300 transition active:scale-[0.97] hover:bg-red-500/25 ${
                nextHref ? "" : "pointer-events-none opacity-40"
              }`}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>

          <div
            ref={contentRef}
            className="mx-auto mt-5 flex max-w-4xl flex-col px-3 sm:px-4"
            onClick={toggleControls}
            style={{
              transform: `scale(${settings.zoom})`,
              transformOrigin: "top center",
              filter: imageFilterCss,
            }}
          >
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  ref={(el) => {
                    pageRefs.current[index] = el;
                  }}
                >
                  <ReaderImage
                    src={page.image}
                    alt={`${chapterPrefix ? `${chapterPrefix} · ` : ""}Page ${index + 1}`}
                    width={page.width ?? undefined}
                    height={page.height ?? undefined}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="block h-auto w-full"
                    placeholderClassName="min-h-[60vh]"
                  />
                </div>
              ))}
          </div>

          <nav className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-3 px-4">
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
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-300 transition active:scale-[0.97] hover:bg-red-500/25 ${
                nextHref ? "" : "pointer-events-none opacity-40"
              }`}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </>
      ) : (
        <div
          className="fixed inset-0 z-0 overflow-auto bg-zinc-950"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={onViewportClick}
        >
          <div className="flex min-h-full items-center justify-center px-4 pb-16 pt-20">
            <div style={{ transform: `scale(${settings.zoom})`, filter: imageFilterCss }}>
              <ReaderImage
                key={pages[pagedIndex]?.id}
                src={pages[pagedIndex]?.image ?? ""}
                alt={`${chapterPrefix ? `${chapterPrefix} · ` : ""}Page ${pagedIndex + 1}`}
                width={pages[pagedIndex]?.width}
                height={pages[pagedIndex]?.height}
                loading="eager"
                className="rounded-lg object-contain shadow-2xl shadow-zinc-950/60 ring-1 ring-white/5"
                style={fitStyle}
              />
            </div>
          </div>

          {pages[pagedIndex + 1] && (
            <link
              rel="preload"
              as="image"
              href={pages[pagedIndex + 1].image}
            />
          )}

          {settings.tapZones && (
            <>
              <button
                type="button"
                onClick={zonePrev}
                aria-label="Previous page"
                title="Previous page"
                className="absolute inset-y-0 left-0 z-10 w-1/3"
              />
              <button
                type="button"
                onClick={zoneNext}
                aria-label="Next page"
                title="Next page"
                className="absolute inset-y-0 right-0 z-10 w-1/3"
              />
            </>
          )}

          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <span className="rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur-xl">
              {pagedIndex + 1} / {pages.length}
            </span>
          </div>
        </div>
      )}

      <nav
        aria-label="Reader controls"
        className={`fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-950/70 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/10 backdrop-blur-xl transition-opacity duration-300 sm:right-5 sm:flex ${uiHidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        {renderControls(railButton)}
      </nav>

      {!open && !settingsOpen && advanceCount === null && !uiHidden && (
        <nav
          aria-label="Reader controls"
          className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4 transition-all duration-300 sm:hidden ${
            controlsVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <div className="flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-950/85 px-1.5 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
            {renderControls(mobileRailButton)}
          </div>
        </nav>
      )}

      {advanceCount !== null && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
        >
          <div className="flex items-center gap-4 rounded-full border border-red-500/40 bg-zinc-950/90 px-5 py-2.5 backdrop-blur-xl">
            <p className="min-w-0 text-sm text-zinc-300">
              {nextChapterLabel ? (
                <>
                  Next:{" "}
                  <span className="font-semibold text-white">
                    {nextChapterLabel}
                  </span>{" "}
                  in <span className="font-bold text-red-300">{advanceCount}</span>
                </>
              ) : (
                <>
                  Next chapter in{" "}
                  <span className="font-bold text-red-300">{advanceCount}</span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={stopAdvance}
              className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:border-red-400/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reader settings"
          onClick={() => setSettingsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-zinc-950/60"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-base font-bold tracking-tight text-white">
                Reader Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition active:scale-95 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
              <section>
                <SectionLabel>Reading mode</SectionLabel>
                <Segmented
                  value={mode}
                  onChange={(value) => switchMode(value)}
                  options={[
                    { value: "webtoon" as const, label: "Webtoon" },
                    { value: "paged" as const, label: "Paged" },
                  ]}
                />
              </section>

              {mode === "paged" && (
                <>
                  <section>
                    <SectionLabel>Reading direction</SectionLabel>
                    <Segmented
                      value={settings.direction}
                      onChange={(value) => updateSettings({ direction: value })}
                      options={[
                        { value: "ltr" as const, label: "Left → Right" },
                        { value: "rtl" as const, label: "Right → Left" },
                      ]}
                    />
                  </section>
                  <section>
                    <SectionLabel>Page fit</SectionLabel>
                    <Segmented
                      value={settings.fit}
                      onChange={(value) => updateSettings({ fit: value })}
                      options={[
                        { value: "height" as const, label: "Fit height" },
                        { value: "width" as const, label: "Fit width" },
                      ]}
                    />
                  </section>
                  <Toggle
                    checked={settings.tapZones}
                    onChange={(value) => updateSettings({ tapZones: value })}
                    label="Tap zones (left / right edges)"
                  />
                </>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <SectionLabel>Brightness</SectionLabel>
                  <span className="text-xs font-semibold text-zinc-400">
                    {Math.round(settings.brightness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={settings.brightness}
                  onChange={(event) =>
                    updateSettings({ brightness: Number(event.target.value) })
                  }
                  className="w-full accent-red-500"
                  aria-label="Brightness"
                />
              </section>

              <section>
                <SectionLabel>Color filter</SectionLabel>
                <Segmented
                  value={settings.filter}
                  onChange={(value) => updateSettings({ filter: value })}
                  options={[
                    { value: "none" as const, label: "Normal" },
                    { value: "sepia" as const, label: "Sepia" },
                  ]}
                />
              </section>

              <Toggle
                checked={settings.autoAdvance}
                onChange={(value) => updateSettings({ autoAdvance: value })}
                label="Auto-advance to next chapter at the end"
              />

              <div className="flex justify-end border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setReaderSettings({ ...DEFAULT_READER_SETTINGS })
                  }
                  className="rounded-lg border border-white/10 bg-zinc-800/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-white"
                >
                  Reset defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
