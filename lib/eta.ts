import { useSyncExternalStore } from "react";

/**
 * Live reading-speed + ETA estimates.
 *
 * A single global average (seconds per page) is learned from actual page
 * turns in the reader and persisted to localStorage. Chapter and series
 * ETAs are derived from it with a sane default for new readers.
 */

export const ETA_STORAGE_KEY = "hana:reading-speed";
export const ETA_EVENT = "hana:reading-speed-updated";

/** Default pace for a new reader: ~15s per page (≈20 pages in 5 min). */
export const DEFAULT_SEC_PER_PAGE = 15;
/** Webtoon pages are long strips — they take roughly 2x a paged page. */
export const WEBTOON_PAGE_FACTOR = 2;

const MIN_SEC_PER_PAGE = 4;
const MAX_SEC_PER_PAGE = 120;
/** Ignore page turns faster/slower than these (skimming / AFK). */
const MIN_SAMPLE_SEC = 3;
const MAX_SAMPLE_SEC = 300;

type SpeedSnapshot = { totalPages: number; totalSeconds: number };

let cached: SpeedSnapshot | null | undefined;

function readSnapshot(): SpeedSnapshot | null {
  if (typeof window === "undefined") return null;
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(ETA_STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as SpeedSnapshot) : null;
    if (
      !cached ||
      !Number.isFinite(cached.totalPages) ||
      !Number.isFinite(cached.totalSeconds) ||
      cached.totalPages <= 0 ||
      cached.totalSeconds <= 0
    ) {
      cached = null;
    }
  } catch {
    cached = null;
  }
  return cached;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ETA_STORAGE_KEY) {
      cached = undefined;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ETA_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ETA_EVENT, onChange);
  };
}

function getSnapshot(): SpeedSnapshot | null {
  return readSnapshot();
}

function getServerSnapshot(): SpeedSnapshot | null {
  return null;
}

/** Personal seconds-per-page, or the default for new readers. */
export function getSecPerPage(): number {
  const snap = readSnapshot();
  if (!snap) return DEFAULT_SEC_PER_PAGE;
  const avg = snap.totalSeconds / snap.totalPages;
  if (!Number.isFinite(avg)) return DEFAULT_SEC_PER_PAGE;
  return Math.min(MAX_SEC_PER_PAGE, Math.max(MIN_SEC_PER_PAGE, avg));
}

export function useSecPerPage(): number {
  return useSyncExternalStore(
    subscribe,
    () => getSecPerPage(),
    () => DEFAULT_SEC_PER_PAGE,
  );
}

/**
 * Record that `pages` pages took `seconds` seconds.
 * Outliers (skim / AFK) are ignored. Keeps a capped rolling total so the
 * average adapts over time without growing localStorage.
 */
export function recordReadingTime(pages: number, seconds: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(pages) || !Number.isFinite(seconds)) return;
  if (pages <= 0) return;
  const perPage = seconds / pages;
  if (perPage < MIN_SAMPLE_SEC || perPage > MAX_SAMPLE_SEC) return;

  const prev = readSnapshot() ?? { totalPages: 0, totalSeconds: 0 };
  // Cap the window at ~500 pages so old history decays.
  const CAP_PAGES = 500;
  let { totalPages, totalSeconds } = prev;
  if (totalPages >= CAP_PAGES) {
    const scale = CAP_PAGES / (totalPages + pages);
    totalPages *= scale;
    totalSeconds *= scale;
  }
  totalPages += pages;
  totalSeconds += seconds;
  cached = { totalPages, totalSeconds };
  try {
    window.localStorage.setItem(ETA_STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // storage blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(ETA_EVENT));
}

export function invalidateEtaCache(): void {
  cached = undefined;
}

/** Estimated seconds to read `pageCount` pages in the given mode. */
export function estimateChapterSeconds(
  pageCount: number,
  secPerPage = DEFAULT_SEC_PER_PAGE,
  webtoon = false,
): number {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 0;
  return pageCount * secPerPage * (webtoon ? WEBTOON_PAGE_FACTOR : 1);
}

/**
 * Estimated seconds to read `remainingChapters` chapters averaging
 * `avgPagesPerChapter` pages each.
 */
export function estimateSeriesSeconds(
  remainingChapters: number,
  avgPagesPerChapter: number,
  secPerPage = DEFAULT_SEC_PER_PAGE,
): number {
  if (!Number.isFinite(remainingChapters) || remainingChapters <= 0) return 0;
  if (!Number.isFinite(avgPagesPerChapter) || avgPagesPerChapter <= 0) {
    avgPagesPerChapter = 20;
  }
  return remainingChapters * avgPagesPerChapter * secPerPage;
}

/** Compact human ETA: "45s", "3 min", "1h 20m". Zero/negative → "…". */
export function formatEta(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "…";
  if (totalSeconds < 60) return `${Math.max(1, Math.round(totalSeconds))}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "~3 min left" / "~1h 20m left" label, or null when unknown. */
export function formatEtaLeft(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 15) {
    return totalSeconds > 0 ? "almost done" : null;
  }
  return `~${formatEta(totalSeconds)} left`;
}

// Re-export for the subscribe hook without a circular import.
export { getSnapshot as getEtaSnapshot, getServerSnapshot as getEtaServerSnapshot, subscribe as subscribeEta };
