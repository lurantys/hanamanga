import { useSyncExternalStore } from "react";

export const READ_STORAGE_KEY = "hana:read-chapters";
export const READ_EVENT = "hana:read-chapters-updated";

type ReadMap = Record<string, Record<string, number>>;

let cached: ReadMap | undefined;
const setCache = new Map<string, ReadonlySet<string>>();

const EMPTY_READ_SET: ReadonlySet<string> = new Set();

function read(): ReadMap {
  if (typeof window === "undefined") return {};
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    cached = {};
  }
  return cached;
}

function write(map: ReadMap): void {
  if (typeof window === "undefined") return;
  cached = map;
  setCache.clear();
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage full or blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(READ_EVENT));
}

function invalidate(): void {
  cached = undefined;
  setCache.clear();
}

export function markChapterRead(mangaId: string, chapterId: string): void {
  const map = read();
  const manga = map[mangaId] ?? {};
  if (manga[chapterId]) return;
  write({ ...map, [mangaId]: { ...manga, [chapterId]: Date.now() } });
}

export function markChapterUnread(mangaId: string, chapterId: string): void {
  const map = read();
  const manga = map[mangaId];
  if (!manga?.[chapterId]) return;
  const next = { ...manga };
  delete next[chapterId];
  write({ ...map, [mangaId]: next });
}

export function isChapterRead(mangaId: string, chapterId: string): boolean {
  return Boolean(read()[mangaId]?.[chapterId]);
}

export function getReadChapters(mangaId: string): Record<string, number> {
  return read()[mangaId] ?? {};
}

export function getReadChaptersSet(mangaId: string): ReadonlySet<string> {
  const existing = setCache.get(mangaId);
  if (existing) return existing;
  const set = new Set(Object.keys(getReadChapters(mangaId)));
  setCache.set(mangaId, set);
  return set;
}

export function getReadSnapshot(): ReadMap {
  return read();
}

/** Mark the target chapter and everything before it as read (chapters in reading order). */
export function markAllBeforeRead(
  mangaId: string,
  chapters: { id: string }[],
  targetId: string,
): void {
  const targetIndex = chapters.findIndex((chapter) => chapter.id === targetId);
  if (targetIndex === -1) return;
  const ids = chapters.slice(0, targetIndex + 1).map((chapter) => chapter.id);
  markAllRead(mangaId, ids);
}

export function markAllRead(mangaId: string, chapterIds: string[]): void {
  const map = read();
  const existing = map[mangaId] ?? {};
  const next = { ...existing };
  const now = Date.now();
  for (const id of chapterIds) {
    if (!next[id]) next[id] = now;
  }
  write({ ...map, [mangaId]: next });
}

export function subscribeReadState(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === READ_STORAGE_KEY) invalidate();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READ_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READ_EVENT, onChange);
  };
}

export function useReadChapters(mangaId: string): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeReadState,
    () => getReadChaptersSet(mangaId),
    () => EMPTY_READ_SET,
  );
}
