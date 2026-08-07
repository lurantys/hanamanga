export type ReaderMode = "webtoon" | "paged";
export type ReaderDirection = "ltr" | "rtl";
export type PageFit = "height" | "width";
export type ImageFilter = "none" | "sepia";

export type ReaderSettings = {
  mode: ReaderMode;
  direction: ReaderDirection;
  fit: PageFit;
  brightness: number;
  filter: ImageFilter;
  tapZones: boolean;
  autoAdvance: boolean;
  zoom: number;
};

export const READER_SETTINGS_KEY = "hana:reader-settings";
export const READER_SETTINGS_EVENT = "hana:reader-settings-updated";

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  mode: "webtoon",
  direction: "ltr",
  fit: "height",
  brightness: 1,
  filter: "none",
  tapZones: true,
  autoAdvance: true,
  zoom: 1,
};

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

let cached: ReaderSettings | undefined;

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(READER_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
      cached = {
        ...DEFAULT_READER_SETTINGS,
        ...parsed,
        brightness: clamp(
          parsed.brightness ?? DEFAULT_READER_SETTINGS.brightness,
          0.5,
          1.5,
          DEFAULT_READER_SETTINGS.brightness,
        ),
        zoom: clamp(
          parsed.zoom ?? DEFAULT_READER_SETTINGS.zoom,
          0.5,
          2,
          DEFAULT_READER_SETTINGS.zoom,
        ),
      };
    } else {
      cached = { ...DEFAULT_READER_SETTINGS };
    }
  } catch {
    cached = { ...DEFAULT_READER_SETTINGS };
  }
  return cached;
}

export function invalidateReaderSettings(): void {
  cached = undefined;
}

export function setReaderSettings(patch: Partial<ReaderSettings>): void {
  const next = { ...getReaderSettings(), ...patch };
  next.brightness = clamp(next.brightness, 0.5, 1.5, DEFAULT_READER_SETTINGS.brightness);
  next.zoom = clamp(next.zoom, 0.5, 2, DEFAULT_READER_SETTINGS.zoom);
  cached = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(READER_SETTINGS_EVENT));
}

export function subscribeReaderSettings(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === READER_SETTINGS_KEY) invalidateReaderSettings();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READER_SETTINGS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READER_SETTINGS_EVENT, onChange);
  };
}
