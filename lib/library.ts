import type { Manga } from "./mangadex";

export type LibraryEntry = {
  manga: Manga;
  addedAt: number;
};

type LibraryMap = Record<string, LibraryEntry>;

export const LIBRARY_STORAGE_KEY = "hana:library";
export const LIBRARY_EVENT = "hana:library-updated";

let cached: LibraryMap | undefined;

function read(): LibraryMap {
  if (typeof window === "undefined") return {};
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as LibraryMap) : {};
  } catch {
    cached = {};
  }
  return cached;
}

function write(map: LibraryMap): void {
  if (typeof window === "undefined") return;
  cached = map;
  try {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage full or blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(LIBRARY_EVENT));
}

export function invalidateLibrary(): void {
  cached = undefined;
}

export function subscribeLibrary(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIBRARY_STORAGE_KEY) invalidateLibrary();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LIBRARY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LIBRARY_EVENT, onChange);
  };
}

export function isInLibrary(mangaId: string): boolean {
  return mangaId in read();
}

export function getLibrarySnapshot(): LibraryMap {
  return read();
}

export function getLibraryList(limit = 100): LibraryEntry[] {
  return Object.values(read())
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, limit);
}

export function toggleLibrary(manga: Manga): void {
  const map = { ...read() };
  if (map[manga.id]) {
    delete map[manga.id];
  } else {
    map[manga.id] = { manga, addedAt: Date.now() };
  }
  write(map);
}

export function removeFromLibrary(mangaId: string): void {
  const map = { ...read() };
  if (map[mangaId]) {
    delete map[mangaId];
    write(map);
  }
}
