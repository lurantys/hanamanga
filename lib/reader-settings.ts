export type ReaderMode = "webtoon" | "paged" | "twopage";
export type ReaderDirection = "ltr" | "rtl";
export type PageFit = "height" | "width";
export type ImageFilter = "none" | "sepia";
export type WebtoonLayout = "gapped" | "continuous";

export type ReaderSettings = {
  mode: ReaderMode;
  direction: ReaderDirection;
  fit: PageFit;
  brightness: number;
  filter: ImageFilter;
  tapZones: boolean;
  autoAdvance: boolean;
  zoom: number;
  webtoonLayout: WebtoonLayout;
};

export const READER_SETTINGS_KEY = "hana:reader-settings";
const READER_SETTINGS_UPDATED_AT_KEY = "hana:reader-settings-updated-at";
export const READER_SETTINGS_EVENT = "hana:reader-settings-updated";

let activeUserId: string | null = null;

function effectiveSettingsKey(): string {
  return activeUserId ? `${READER_SETTINGS_KEY}:${activeUserId}` : READER_SETTINGS_KEY;
}

function effectiveUpdatedAtKey(): string {
  return activeUserId ? `${READER_SETTINGS_UPDATED_AT_KEY}:${activeUserId}` : READER_SETTINGS_UPDATED_AT_KEY;
}

export function setReaderSettingsUserId(userId: string | null): void {
  if (activeUserId === userId) return;
  activeUserId = userId;
  cached = undefined;
  cachedUpdatedAt = undefined;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  mode: "webtoon",
  direction: "ltr",
  fit: "height",
  brightness: 1,
  filter: "none",
  tapZones: true,
  autoAdvance: true,
  zoom: 1,
  webtoonLayout: "gapped",
};

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

let cached: ReaderSettings | undefined;
let cachedUpdatedAt: number | undefined;

function loadUpdatedAt(): number {
  if (cachedUpdatedAt !== undefined) return cachedUpdatedAt;
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(effectiveUpdatedAtKey());
    cachedUpdatedAt = raw ? Number(raw) || 0 : 0;
  } catch {
    cachedUpdatedAt = 0;
  }
  return cachedUpdatedAt;
}

export function getReaderSettingsUpdatedAt(): number {
  return loadUpdatedAt();
}

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(effectiveSettingsKey());
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
  // ensure updatedAt is loaded
  loadUpdatedAt();
  return cached;
}

export function invalidateReaderSettings(): void {
  cached = undefined;
  cachedUpdatedAt = undefined;
}

export function setReaderSettings(patch: Partial<ReaderSettings>): void {
  const next = { ...getReaderSettings(), ...patch };
  next.brightness = clamp(next.brightness, 0.5, 1.5, DEFAULT_READER_SETTINGS.brightness);
  next.zoom = clamp(next.zoom, 0.5, 2, DEFAULT_READER_SETTINGS.zoom);
  cached = next;
  cachedUpdatedAt = Date.now();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(effectiveSettingsKey(), JSON.stringify(next));
    window.localStorage.setItem(effectiveUpdatedAtKey(), String(cachedUpdatedAt));
  } catch {
    // storage full or blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(READER_SETTINGS_EVENT));
}

export function subscribeReaderSettings(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === effectiveSettingsKey() ||
      event.key === effectiveUpdatedAtKey() ||
      event.key === READER_SETTINGS_KEY ||
      event.key === READER_SETTINGS_UPDATED_AT_KEY
    )
      invalidateReaderSettings();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READER_SETTINGS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READER_SETTINGS_EVENT, onChange);
  };
}

/** Replace the entire settings object (used by sync/import). */
export function replaceReaderSettings(settings: ReaderSettings, remoteUpdatedAt?: number): void {
  const next = { ...DEFAULT_READER_SETTINGS, ...settings };
  next.brightness = clamp(next.brightness, 0.5, 1.5, DEFAULT_READER_SETTINGS.brightness);
  next.zoom = clamp(next.zoom, 0.5, 2, DEFAULT_READER_SETTINGS.zoom);
  cached = next;
  cachedUpdatedAt = remoteUpdatedAt ?? Date.now();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(effectiveSettingsKey(), JSON.stringify(next));
    window.localStorage.setItem(effectiveUpdatedAtKey(), String(cachedUpdatedAt));
  } catch {
    // storage full or blocked — ignore
  }
  window.dispatchEvent(new CustomEvent(READER_SETTINGS_EVENT));
}
