import { normalizeTitleKey, titleHits } from "./title";

export type ProgressEntry = {
  mangaId: string;
  chapterId: string;
  chapterLabel: string;
  mangaTitle: string;
  coverUrl?: string | null;
  scrollFraction: number;
  mangaFraction?: number;
  updatedAt: number;
};

export type ContinueHeroManga = {
  id: string;
  title: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  rating?: number;
  description?: string;
  status?: string;
  year?: number;
  follows?: number;
};

export type ContinueHeroSnapshot = {
  manga: ContinueHeroManga;
  chapterId: string;
  chapterLabel: string;
  scrollFraction: number;
  mangaFraction?: number;
  updatedAt: number;
};

const STORAGE_KEY = "hana:progress";
export const CONTINUE_HERO_STORAGE_KEY = "hana:continue-hero";
export const CONTINUE_HERO_EVENT = "hana:continue-hero-updated";
export const PROGRESS_EVENT = "hana:progress-updated";

let cachedHeroSnapshot: ContinueHeroSnapshot | null | undefined;
let cachedContinueLimit = 0;
let cachedContinueList: ProgressEntry[] | null = null;
let cachedProgressMap: Record<string, ProgressEntry> | null = null;

function readAll(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  if (cachedProgressMap) return cachedProgressMap;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedProgressMap = raw ? (JSON.parse(raw) as Record<string, ProgressEntry>) : {};
  } catch {
    cachedProgressMap = {};
  }
  return cachedProgressMap;
}

function writeAll(map: Record<string, ProgressEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    cachedProgressMap = map;
    cachedContinueList = null;
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  } catch {
    // storage full or blocked — ignore
  }
}

export function invalidateProgressCache(): void {
  cachedProgressMap = null;
}

/** Replace the entire progress map (used by sync/import). */
export function replaceProgress(map: Record<string, ProgressEntry>): void {
  writeAll(map);
}

export function saveProgress(entry: ProgressEntry): void {
  const map = readAll();
  map[entry.mangaId] = entry;
  writeAll(map);
}

export function getProgress(
  mangaId: string,
  alternateIds?: (string | null | undefined)[],
  mangaTitle?: string | null,
): ProgressEntry | null {
  const map = readAll();
  if (!map || Object.keys(map).length === 0) return null;

  // 1. Direct match
  if (map[mangaId]) return map[mangaId];

  // 2. Decode/Encode variations
  const keysToTry: string[] = [];
  try {
    const decoded = decodeURIComponent(mangaId);
    if (decoded !== mangaId) keysToTry.push(decoded);
    const encoded = encodeURIComponent(mangaId);
    if (encoded !== mangaId) keysToTry.push(encoded);
  } catch {
    // ignore
  }

  // 3. Prefix variations: al:123 <-> 123, atsu:123 <-> 123
  for (const k of [mangaId, ...keysToTry]) {
    if (k.startsWith("al:")) {
      keysToTry.push(k.slice(3));
      keysToTry.push(`al%3A${k.slice(3)}`);
    } else if (k.startsWith("al%3A")) {
      keysToTry.push(k.slice(5));
      keysToTry.push(`al:${k.slice(5)}`);
    } else if (k.startsWith("atsu:")) {
      keysToTry.push(k.slice(5));
      keysToTry.push(`atsu%3A${k.slice(5)}`);
    } else if (k.startsWith("atsu%3A")) {
      keysToTry.push(k.slice(7));
      keysToTry.push(`atsu:${k.slice(7)}`);
    } else {
      keysToTry.push(`al:${k}`);
      keysToTry.push(`atsu:${k}`);
    }
  }

  // 4. Alternate IDs (e.g. from catalog/atsu match/links)
  if (alternateIds?.length) {
    for (const alt of alternateIds) {
      if (!alt) continue;
      keysToTry.push(alt);
      try {
        const decoded = decodeURIComponent(alt);
        if (decoded !== alt) keysToTry.push(decoded);
      } catch {
        // ignore
      }
    }
  }

  for (const key of keysToTry) {
    if (map[key]) return map[key];
  }

  // 5. Fallback: match by normalized title if provided
  if (mangaTitle) {
    const normalizedTarget = normalizeTitleKey(mangaTitle);
    if (normalizedTarget) {
      for (const entry of Object.values(map)) {
        if (
          entry.mangaTitle &&
          (normalizeTitleKey(entry.mangaTitle) === normalizedTarget ||
            titleHits(mangaTitle, [entry.mangaTitle]))
        ) {
          return entry;
        }
      }
    }
  }

  return null;
}

export function getAllProgress(): Record<string, ProgressEntry> {
  return readAll();
}

export function subscribeProgress(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) invalidateProgressCache();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROGRESS_EVENT, onChange);
  };
}

export function getContinueList(limit = 18): ProgressEntry[] {
  if (!cachedContinueList || cachedContinueLimit !== limit) {
    cachedContinueList = Object.values(readAll())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
    cachedContinueLimit = limit;
  }
  return cachedContinueList;
}

export function saveContinueHero(snapshot: ContinueHeroSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONTINUE_HERO_STORAGE_KEY, JSON.stringify(snapshot));
    cachedHeroSnapshot = snapshot;
    window.dispatchEvent(new CustomEvent(CONTINUE_HERO_EVENT));
  } catch {
    // storage full or blocked — ignore
  }
}

export function invalidateContinueHero(): void {
  cachedHeroSnapshot = undefined;
}

export function readContinueHero(): ContinueHeroSnapshot | null {
  if (typeof window === "undefined") return null;
  if (cachedHeroSnapshot !== undefined) return cachedHeroSnapshot;
  try {
    const raw = window.localStorage.getItem(CONTINUE_HERO_STORAGE_KEY);
    cachedHeroSnapshot = raw
      ? (JSON.parse(raw) as ContinueHeroSnapshot)
      : null;
  } catch {
    cachedHeroSnapshot = null;
  }
  return cachedHeroSnapshot;
}

export function clearProgress(mangaId: string): void {
  const map = readAll();
  if (map[mangaId]) {
    delete map[mangaId];
    writeAll(map);
  }
}
