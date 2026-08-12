export type ProgressEntry = {
  mangaId: string;
  chapterId: string;
  chapterLabel: string;
  mangaTitle: string;
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

function readAll(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProgressEntry>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ProgressEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    cachedContinueList = null;
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  } catch {
    // storage full or blocked — ignore
  }
}

export function saveProgress(entry: ProgressEntry): void {
  const map = readAll();
  map[entry.mangaId] = entry;
  writeAll(map);
}

export function getProgress(mangaId: string): ProgressEntry | null {
  return readAll()[mangaId] ?? null;
}

export function getAllProgress(): Record<string, ProgressEntry> {
  return readAll();
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
