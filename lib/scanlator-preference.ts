import { useSyncExternalStore } from "react";
import { createStorageStore, type StorageStore } from "./storage";

export const SCANLATOR_PREFERENCE_KEY = "hana:scanlator-preference";
export const SCANLATOR_PREFERENCE_EVENT = "hana:scanlator-preference-updated";

type ScanlatorMap = Record<string, string>;

const store: StorageStore<ScanlatorMap> = createStorageStore<ScanlatorMap>(
  SCANLATOR_PREFERENCE_KEY,
  SCANLATOR_PREFERENCE_EVENT,
  {},
);

export function getPreferredScanlator(mangaId: string): string | null {
  return store.getSnapshot()[mangaId] ?? null;
}

export function setPreferredScanlator(mangaId: string, scanlatorId: string): void {
  const map = store.getSnapshot();
  if (map[mangaId] === scanlatorId) return;
  store.setSnapshot({ ...map, [mangaId]: scanlatorId });
}

export function usePreferredScanlator(mangaId: string): string | null {
  return useSyncExternalStore(
    store.subscribe,
    () => getPreferredScanlator(mangaId),
    () => null,
  );
}
