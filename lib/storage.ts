export type StorageStore<T> = {
  getSnapshot: () => T;
  setSnapshot: (next: T) => void;
  invalidate: () => void;
  subscribe: (onChange: () => void) => () => void;
};

let globalUserId: string | null = null;
const invalidators: Array<() => void> = [];

function effectiveKey(baseKey: string): string {
  return globalUserId ? `${baseKey}:${globalUserId}` : baseKey;
}

export function getStorageUserId(): string | null {
  return globalUserId;
}

export function setStorageUserId(userId: string | null): void {
  if (globalUserId === userId) return;
  globalUserId = userId;
  for (const fn of invalidators) fn();
}

export function createStorageStore<T>(
  key: string,
  event: string,
  empty: T,
): StorageStore<T> {
  let cached: T | undefined;

  const invalidate = (): void => {
    cached = undefined;
  };

  // Register so a user switch clears the in-memory cache and forces
  // the next read to use the per-account localStorage key.
  invalidators.push(invalidate);

  const getSnapshot = (): T => {
    if (typeof window === "undefined") return empty;
    if (cached !== undefined) return cached;
    try {
      const raw = window.localStorage.getItem(effectiveKey(key));
      cached = raw ? (JSON.parse(raw) as T) : empty;
    } catch {
      cached = empty;
    }
    return cached;
  };

  const setSnapshot = (next: T): void => {
    if (typeof window === "undefined") return;
    cached = next;
    try {
      window.localStorage.setItem(effectiveKey(key), JSON.stringify(next));
    } catch {
      // storage full or blocked — ignore
    }
    window.dispatchEvent(new CustomEvent(event));
  };

  const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window === "undefined") return () => {};
    const onStorage = (storageEvent: StorageEvent) => {
      // storage events are per-effective key; also invalidate on base
      // key so a device that wrote before namespacing still propagates.
      if (
        storageEvent.key === effectiveKey(key) ||
        storageEvent.key === key
      )
        cached = undefined;
      onChange();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(event, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(event, onChange);
    };
  };

  return { getSnapshot, setSnapshot, invalidate, subscribe };
}
