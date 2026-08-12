import type { Manga } from "./mangadex";
import { createStorageStore, type StorageStore } from "./storage";

export type LibraryEntry = {
  manga: Manga;
  addedAt: number;
};

type LibraryMap = Record<string, LibraryEntry>;

export const LIBRARY_STORAGE_KEY = "hana:library";
export const LIBRARY_EVENT = "hana:library-updated";

const store: StorageStore<LibraryMap> = createStorageStore<LibraryMap>(
  LIBRARY_STORAGE_KEY,
  LIBRARY_EVENT,
  {},
);

export function invalidateLibrary(): void {
  store.invalidate();
}

export function subscribeLibrary(onChange: () => void): () => void {
  return store.subscribe(onChange);
}

export function isInLibrary(mangaId: string): boolean {
  return mangaId in store.getSnapshot();
}

export function getLibrarySnapshot(): LibraryMap {
  return store.getSnapshot();
}

export function getLibraryList(limit = 100): LibraryEntry[] {
  return Object.values(store.getSnapshot())
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, limit);
}

export function toggleLibrary(manga: Manga): void {
  const map = { ...store.getSnapshot() };
  if (map[manga.id]) {
    delete map[manga.id];
  } else {
    map[manga.id] = { manga, addedAt: Date.now() };
  }
  store.setSnapshot(map);
}

export function removeFromLibrary(mangaId: string): void {
  const map = { ...store.getSnapshot() };
  if (map[mangaId]) {
    delete map[mangaId];
    store.setSnapshot(map);
  }
}
