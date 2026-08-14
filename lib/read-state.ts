import { useSyncExternalStore } from "react";
import { createStorageStore, type StorageStore } from "./storage";

export const READ_STORAGE_KEY = "hana:read-chapters";
export const READ_EVENT = "hana:read-chapters-updated";

type ReadMap = Record<string, Record<string, number>>;

const store: StorageStore<ReadMap> = createStorageStore<ReadMap>(
  READ_STORAGE_KEY,
  READ_EVENT,
  {},
);

const setCache = new Map<string, ReadonlySet<string>>();

const EMPTY_READ_SET: ReadonlySet<string> = new Set();

export function markChapterRead(mangaId: string, chapterId: string): void {
  const map = store.getSnapshot();
  const manga = map[mangaId] ?? {};
  if (manga[chapterId]) return;
  setCache.delete(mangaId);
  store.setSnapshot({ ...map, [mangaId]: { ...manga, [chapterId]: Date.now() } });
}

export function markChapterUnread(mangaId: string, chapterId: string): void {
  const map = store.getSnapshot();
  const manga = map[mangaId];
  if (!manga?.[chapterId]) return;
  const next = { ...manga };
  delete next[chapterId];
  setCache.delete(mangaId);
  store.setSnapshot({ ...map, [mangaId]: next });
}

export function isChapterRead(mangaId: string, chapterId: string): boolean {
  return Boolean(store.getSnapshot()[mangaId]?.[chapterId]);
}

export function getReadChapters(mangaId: string): Record<string, number> {
  return store.getSnapshot()[mangaId] ?? {};
}

export function getReadChaptersSet(mangaId: string): ReadonlySet<string> {
  const existing = setCache.get(mangaId);
  if (existing) return existing;
  const set = new Set(Object.keys(getReadChapters(mangaId)));
  setCache.set(mangaId, set);
  return set;
}

export function getReadSnapshot(): ReadMap {
  return store.getSnapshot();
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
  const map = store.getSnapshot();
  const existing = map[mangaId] ?? {};
  const next = { ...existing };
  const now = Date.now();
  for (const id of chapterIds) {
    if (!next[id]) next[id] = now;
  }
  setCache.delete(mangaId);
  store.setSnapshot({ ...map, [mangaId]: next });
}

export function subscribeReadState(onChange: () => void): () => void {
  return store.subscribe(onChange);
}

export function useReadChapters(mangaId: string): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeReadState,
    () => getReadChaptersSet(mangaId),
    () => EMPTY_READ_SET,
  );
}
