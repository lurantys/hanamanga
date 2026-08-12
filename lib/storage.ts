export type StorageStore<T> = {
  getSnapshot: () => T;
  setSnapshot: (next: T) => void;
  invalidate: () => void;
  subscribe: (onChange: () => void) => () => void;
};

export function createStorageStore<T>(
  key: string,
  event: string,
  empty: T,
): StorageStore<T> {
  let cached: T | undefined;

  const getSnapshot = (): T => {
    if (typeof window === "undefined") return empty;
    if (cached !== undefined) return cached;
    try {
      const raw = window.localStorage.getItem(key);
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
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked — ignore
    }
    window.dispatchEvent(new CustomEvent(event));
  };

  const invalidate = (): void => {
    cached = undefined;
  };

  const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window === "undefined") return () => {};
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key === key) cached = undefined;
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
