import { createClient } from "./supabase/client";
import {
  getLibrarySnapshot,
  replaceLibrary,
  removeFromLibrary,
  LIBRARY_EVENT,
  type LibraryMap,
} from "./library";
import {
  getAllProgress,
  replaceProgress,
  PROGRESS_EVENT,
  type ProgressEntry,
} from "./progress";
import {
  getReadSnapshot,
  replaceReadState,
  READ_EVENT,
  type ReadMap,
} from "./read-state";
import {
  getReaderSettings,
  replaceReaderSettings,
  READER_SETTINGS_EVENT,
  type ReaderSettings,
} from "./reader-settings";
import {
  getPreferredScanlators,
  replaceScanlatorPreference,
  SCANLATOR_PREFERENCE_EVENT,
  type ScanlatorMap,
} from "./scanlator-preference";

type LibraryRow = {
  user_id: string;
  manga_id: string;
  manga: unknown;
  added_at: number;
};

type ProgressRow = {
  user_id: string;
  manga_id: string;
  chapter_id: string;
  chapter_label: string;
  manga_title: string;
  cover_url: string | null;
  scroll_fraction: number;
  manga_fraction: number | null;
  updated_at: number;
};

type ReadStateRow = {
  user_id: string;
  manga_id: string;
  chapter_id: string;
  read_at: number;
};

type SettingsRow = {
  user_id: string;
  settings: ReaderSettings;
  updated_at: number;
};

type ScanlatorRow = {
  user_id: string;
  manga_id: string;
  scanlator_id: string;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => [k, canonicalJson(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return `{${entries.map(([k, v]) => JSON.stringify(k) + ":" + v).join(",")}}`;
}

const FLUSH_MS = 800;

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
  wrapped.flush = () => {
    clearTimeout(timer);
    fn();
  };
  return wrapped;
}

let currentUserId: string | null = null;
let localDisposers: Array<() => void> = [];
let realtimeChannel: { unsubscribe: () => Promise<void> } | null = null;

const lastPushedLibrary = new Set<string>();
const lastPushedProgress = new Set<string>();
const lastPushedReadState = new Set<string>();

function sameJson(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

async function pushLibrary(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getLibrarySnapshot();
  const rows = Object.entries(map).map(([mangaId, entry]) => ({
    user_id: userId,
    manga_id: mangaId,
    manga: entry.manga,
    added_at: entry.addedAt,
  }));
  if (rows.length) {
    await supabase.from("hana_library").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
  }
  const removed = [...lastPushedLibrary].filter((id) => !(id in map));
  if (removed.length) {
    await supabase.from("hana_library").delete().in("manga_id", removed);
  }
  lastPushedLibrary.clear();
  for (const id of Object.keys(map)) lastPushedLibrary.add(id);
}

async function pushProgress(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getAllProgress();
  const rows = Object.values(map).map((entry) => ({
    user_id: userId,
    manga_id: entry.mangaId,
    chapter_id: entry.chapterId,
    chapter_label: entry.chapterLabel,
    manga_title: entry.mangaTitle,
    cover_url: entry.coverUrl ?? null,
    scroll_fraction: entry.scrollFraction,
    manga_fraction: entry.mangaFraction ?? null,
    updated_at: entry.updatedAt,
  }));
  if (rows.length) {
    await supabase.from("hana_progress").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
  }
  const removed = [...lastPushedProgress].filter((id) => !(id in map));
  if (removed.length) {
    await supabase.from("hana_progress").delete().in("manga_id", removed);
  }
  lastPushedProgress.clear();
  for (const id of Object.keys(map)) lastPushedProgress.add(id);
}

async function pushReadState(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getReadSnapshot();
  const rows: ReadStateRow[] = [];
  for (const [mangaId, chapters] of Object.entries(map)) {
    for (const [chapterId, readAt] of Object.entries(chapters)) {
      rows.push({ user_id: userId, manga_id: mangaId, chapter_id: chapterId, read_at: readAt });
    }
  }
  if (rows.length) {
    await supabase.from("hana_read_state").upsert(rows, {
      onConflict: "user_id,manga_id,chapter_id",
    });
  }
  const removed: string[] = [];
  for (const key of lastPushedReadState) {
    const [mangaId, chapterId] = key.split("|");
    if (!map[mangaId]?.[chapterId]) removed.push(`${mangaId}|${chapterId}`);
  }
  const removedRows = removed.map((key) => {
    const [mangaId, chapterId] = key.split("|");
    return { manga_id: mangaId, chapter_id: chapterId };
  });
  for (const row of removedRows) {
    await supabase
      .from("hana_read_state")
      .delete()
      .eq("manga_id", row.manga_id)
      .eq("chapter_id", row.chapter_id);
  }
  lastPushedReadState.clear();
  for (const [mangaId, chapters] of Object.entries(map)) {
    for (const chapterId of Object.keys(chapters)) {
      lastPushedReadState.add(`${mangaId}|${chapterId}`);
    }
  }
}

async function pushSettings(userId: string): Promise<void> {
  const supabase = createClient();
  const settings = getReaderSettings();
  await supabase
    .from("hana_reader_settings")
    .upsert(
      [{ user_id: userId, settings, updated_at: Date.now() }],
      { onConflict: "user_id" },
    );
}

async function pushScanlatorPrefs(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getPreferredScanlators();
  const rows = Object.entries(map).map(([mangaId, scanlatorId]) => ({
    user_id: userId,
    manga_id: mangaId,
    scanlator_id: scanlatorId,
  }));
  if (rows.length) {
    await supabase.from("hana_scanlator_preference").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
  }
}

export async function pushAll(userId: string): Promise<void> {
  await Promise.allSettled([
    pushLibrary(userId),
    pushProgress(userId),
    pushReadState(userId),
    pushSettings(userId),
    pushScanlatorPrefs(userId),
  ]);
}

async function pullLibrary(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_library")
    .select("manga_id, manga, added_at")
    .eq("user_id", userId);
  if (!data) return;
  const local = getLibrarySnapshot();
  const merged: LibraryMap = { ...local };
  for (const row of data as LibraryRow[]) {
    const existing = local[row.manga_id];
    if (!existing || row.added_at > existing.addedAt) {
      merged[row.manga_id] = {
        manga: row.manga as LibraryMap[string]["manga"],
        addedAt: row.added_at,
      };
    }
  }
  if (!sameJson(local, merged)) replaceLibrary(merged);
}

async function pullProgress(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_progress")
    .select("*")
    .eq("user_id", userId);
  if (!data) return;
  const local = getAllProgress();
  const merged: Record<string, ProgressEntry> = { ...local };
  for (const row of data as ProgressRow[]) {
    const existing = local[row.manga_id];
    const entry: ProgressEntry = {
      mangaId: row.manga_id,
      chapterId: row.chapter_id,
      chapterLabel: row.chapter_label,
      mangaTitle: row.manga_title,
      coverUrl: row.cover_url ?? undefined,
      scrollFraction: row.scroll_fraction,
      mangaFraction: row.manga_fraction ?? undefined,
      updatedAt: row.updated_at,
    };
    if (!existing || row.updated_at > existing.updatedAt) {
      merged[row.manga_id] = entry;
    }
  }
  if (!sameJson(local, merged)) replaceProgress(merged);
}

async function pullReadState(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_read_state")
    .select("manga_id, chapter_id, read_at")
    .eq("user_id", userId);
  if (!data) return;
  const local = getReadSnapshot();
  const merged: ReadMap = structuredClone(local);
  for (const row of data as ReadStateRow[]) {
    const current = merged[row.manga_id]?.[row.chapter_id];
    if (!current || row.read_at > current) {
      merged[row.manga_id] = {
        ...(merged[row.manga_id] ?? {}),
        [row.chapter_id]: row.read_at,
      };
    }
  }
  if (!sameJson(local, merged)) replaceReadState(merged);
}

async function pullSettings(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_reader_settings")
    .select("settings")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const remote = (data as SettingsRow).settings;
  if (!sameJson(getReaderSettings(), remote)) replaceReaderSettings(remote);
}

async function pullScanlatorPrefs(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_scanlator_preference")
    .select("manga_id, scanlator_id")
    .eq("user_id", userId);
  if (!data) return;
  const local = getPreferredScanlators();
  const merged: ScanlatorMap = { ...local };
  for (const row of data as ScanlatorRow[]) {
    merged[row.manga_id] = row.scanlator_id;
  }
  if (!sameJson(local, merged)) replaceScanlatorPreference(merged);
}

export async function pullAll(userId: string): Promise<void> {
  await Promise.allSettled([
    pullLibrary(userId),
    pullProgress(userId),
    pullReadState(userId),
    pullSettings(userId),
    pullScanlatorPrefs(userId),
  ]);
}

/** Pull remote, merge, then upload the merged state (migrates local data up). */
export async function syncAll(userId: string): Promise<void> {
  await pullAll(userId);
  await pushAll(userId);
}

const localPush = debounce(() => {
  if (!currentUserId) return;
  void pushAll(currentUserId).catch(() => {});
}, FLUSH_MS);

const localPushFlush = () => {
  if (!currentUserId) return;
  void pushAll(currentUserId).catch(() => {});
};

function attachLocalListeners(): void {
  const events = [
    LIBRARY_EVENT,
    PROGRESS_EVENT,
    READ_EVENT,
    READER_SETTINGS_EVENT,
    SCANLATOR_PREFERENCE_EVENT,
  ];
  for (const event of events) {
    window.addEventListener(event, localPush);
  }
  window.addEventListener(LIBRARY_EVENT, scheduleProviderSync);
  window.addEventListener(READ_EVENT, scheduleProviderSync);
  window.addEventListener("beforeunload", localPushFlush);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") localPushFlush();
  };
  window.addEventListener("visibilitychange", onVisibility);
  localDisposers = [
    ...events.map((event) => () => window.removeEventListener(event, localPush)),
    () => window.removeEventListener(LIBRARY_EVENT, scheduleProviderSync),
    () => window.removeEventListener(READ_EVENT, scheduleProviderSync),
    () => window.removeEventListener("beforeunload", localPushFlush),
    () => window.removeEventListener("visibilitychange", onVisibility),
  ];
}

function setupRealtime(userId: string): void {
  const supabase = createClient();
  realtimeChannel = supabase
    .channel(`hana-sync-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_library" },
      (payload: { eventType?: string; old?: { manga_id?: string } | null }) => {
        if (payload.eventType === "DELETE") {
          const removedId = payload.old?.manga_id;
          if (removedId) removeFromLibrary(removedId);
        } else {
          void pullLibrary(userId);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_progress" },
      () => void pullProgress(userId),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_read_state" },
      () => void pullReadState(userId),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_reader_settings" },
      () => void pullSettings(userId),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_scanlator_preference" },
      () => void pullScanlatorPrefs(userId),
    )
    .subscribe();
}

let providerSyncLast = 0;

async function runProviderSync(): Promise<void> {
  if (!currentUserId) return;
  await fetch("/api/integrations/sync", { method: "POST" });
}

const scheduleProviderSync = debounce(() => {
  if (Date.now() - providerSyncLast < 60_000) return;
  providerSyncLast = Date.now();
  void runProviderSync().catch(() => {});
}, 10_000);

export async function syncNow(): Promise<void> {
  if (!currentUserId) return;
  await syncAll(currentUserId);
  providerSyncLast = Date.now();
  await runProviderSync().catch(() => {});
}

export async function handleAuthStateChange(
  userId: string | null,
): Promise<void> {
  if (userId === currentUserId) return;
  if (realtimeChannel) await realtimeChannel.unsubscribe();
  for (const dispose of localDisposers) dispose();
  localDisposers = [];
  currentUserId = userId;
  if (userId) {
    await syncAll(userId);
    attachLocalListeners();
    setupRealtime(userId);
  }
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export async function refreshSession(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const id = session?.user?.id ?? null;
  await handleAuthStateChange(id);
  return id;
}

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", () => {
    void refreshSession();
    scheduleProviderSync();
  });
}
