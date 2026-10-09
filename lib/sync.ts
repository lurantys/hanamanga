import { createClient } from "./supabase/client";
import { ACCOUNT_MAINTENANCE } from "./account-status";
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
  clearProgress,
  PROGRESS_EVENT,
  setProgressUserId,
  CONTINUE_HERO_EVENT,
  type ProgressEntry,
} from "./progress";
import {
  getFinishedSnapshot,
  getReadSnapshot,
  replaceReadState,
  READ_EVENT,
  type ReadMap,
} from "./read-state";
import {
  getReaderSettings,
  getReaderSettingsUpdatedAt,
  replaceReaderSettings,
  READER_SETTINGS_EVENT,
  setReaderSettingsUserId,
  type ReaderSettings,
} from "./reader-settings";
import {
  getPreferredScanlators,
  replaceScanlatorPreference,
  SCANLATOR_PREFERENCE_EVENT,
  type ScanlatorMap,
} from "./scanlator-preference";
import { setStorageUserId } from "./storage";
import type { SyncSummary } from "./provider-sync";
import { clearFetchJsonCache } from "./api-fetch";

type LibraryRow = {
  user_id: string;
  manga_id: string;
  manga: unknown;
  added_at: number;
  library_status?: "to_read" | "reading" | "read";
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
const pendingPushes = new Set<Promise<void>>();

const lastPushedLibrary = new Map<string, string>();
const lastPushedProgress = new Map<string, string>();
const lastPushedReadState = new Map<string, number>();
const lastPushedScanlatorPrefs = new Map<string, string>();
let lastPushedSettings: string | null = null;

const pendingLocalChanges = new Set<string>();
const realtimePullTimers = new Map<string, ReturnType<typeof setTimeout>>();
const realtimePullsInFlight = new Set<string>();
const pendingRealtimePulls = new Set<string>();

function sameJson(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

async function pushLibrary(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getLibrarySnapshot();
  const finished = getFinishedSnapshot();
  const progress = getAllProgress();
  const allRows = Object.entries(map).map(([mangaId, entry]) => ({
    user_id: userId,
    manga_id: mangaId,
    manga: entry.manga,
    added_at: entry.addedAt,
    library_status: entry.status ?? (finished[mangaId] ? "read" : progress[mangaId] ? "reading" : "to_read"),
  }));
  const rows = allRows.filter((row) =>
    lastPushedLibrary.get(row.manga_id) !== canonicalJson(row),
  );
  if (rows.length) {
    const { error } = await supabase.from("hana_library").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
    if (error && /library_status|column/i.test(error.message)) {
      const legacyRows = rows.map((row) => {
        const { library_status, ...legacyRow } = row;
        void library_status;
        return legacyRow;
      });
      const { error: legacyError } = await supabase.from("hana_library").upsert(legacyRows, {
        onConflict: "user_id,manga_id",
      });
      if (!legacyError) {
        for (const row of rows) lastPushedLibrary.set(row.manga_id, canonicalJson(row));
      }
    } else if (!error) {
      for (const row of rows) lastPushedLibrary.set(row.manga_id, canonicalJson(row));
    }
  }
  const removed = [...lastPushedLibrary].filter(([id]) => !(id in map));
  if (removed.length) {
    const { error } = await supabase
      .from("hana_library")
      .delete()
      .eq("user_id", userId)
      .in("manga_id", removed.map(([id]) => id));
    if (!error) for (const [id] of removed) lastPushedLibrary.delete(id);
  }
}

async function pushProgress(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getAllProgress();
  const allRows = Object.values(map).map((entry) => ({
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
  const rows = allRows.filter((row) =>
    lastPushedProgress.get(row.manga_id) !== canonicalJson(row),
  );
  if (rows.length) {
    const { error } = await supabase.from("hana_progress").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
    if (!error) {
      for (const row of rows) lastPushedProgress.set(row.manga_id, canonicalJson(row));
    }
  }
  const removed = [...lastPushedProgress].filter(([id]) => !(id in map));
  if (removed.length) {
    const { error } = await supabase
      .from("hana_progress")
      .delete()
      .eq("user_id", userId)
      .in("manga_id", removed.map(([id]) => id));
    if (!error) for (const [id] of removed) lastPushedProgress.delete(id);
  }
}

async function pushReadState(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getReadSnapshot();
  const allRows: ReadStateRow[] = [];
  for (const [mangaId, chapters] of Object.entries(map)) {
    for (const [chapterId, readAt] of Object.entries(chapters)) {
      allRows.push({ user_id: userId, manga_id: mangaId, chapter_id: chapterId, read_at: readAt });
    }
  }
  const rows = allRows.filter((row) =>
    lastPushedReadState.get(JSON.stringify([row.manga_id, row.chapter_id])) !== row.read_at,
  );
  if (rows.length) {
    const { error } = await supabase.from("hana_read_state").upsert(rows, {
      onConflict: "user_id,manga_id,chapter_id",
    });
    if (!error) {
      for (const row of rows) {
        lastPushedReadState.set(JSON.stringify([row.manga_id, row.chapter_id]), row.read_at);
      }
    }
  }
  const removedByManga = new Map<string, string[]>();
  for (const key of lastPushedReadState.keys()) {
    const [mangaId, chapterId] = JSON.parse(key) as [string, string];
    if (!map[mangaId]?.[chapterId]) {
      const chapters = removedByManga.get(mangaId) ?? [];
      chapters.push(chapterId);
      removedByManga.set(mangaId, chapters);
    }
  }
  for (const [mangaId, chapterIds] of removedByManga) {
    const { error } = await supabase
      .from("hana_read_state")
      .delete()
      .eq("user_id", userId)
      .eq("manga_id", mangaId)
      .in("chapter_id", chapterIds);
    if (!error) {
      for (const chapterId of chapterIds) {
        lastPushedReadState.delete(JSON.stringify([mangaId, chapterId]));
      }
    }
  }
}

async function pushSettings(userId: string): Promise<void> {
  const supabase = createClient();
  const settings = getReaderSettings();
  // Use the local updatedAt (set by setReaderSettings) so remote and local stay in sync.
  // If no local timestamp yet, fall back to now.
  const updated_at = getReaderSettingsUpdatedAt() || Date.now();
  const row = { user_id: userId, settings, updated_at };
  const signature = canonicalJson(row);
  if (lastPushedSettings === signature) return;
  const { error } = await supabase
    .from("hana_reader_settings")
    .upsert([row], { onConflict: "user_id" });
  if (!error) lastPushedSettings = signature;
}

async function pushScanlatorPrefs(userId: string): Promise<void> {
  const supabase = createClient();
  const map = getPreferredScanlators();
  const allRows = Object.entries(map).map(([mangaId, scanlatorId]) => ({
    user_id: userId,
    manga_id: mangaId,
    scanlator_id: scanlatorId,
  }));
  const rows = allRows.filter((row) =>
    lastPushedScanlatorPrefs.get(row.manga_id) !== row.scanlator_id,
  );
  if (rows.length) {
    const { error } = await supabase.from("hana_scanlator_preference").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
    if (!error) {
      for (const row of rows) lastPushedScanlatorPrefs.set(row.manga_id, row.scanlator_id);
    }
  }
  const removed = [...lastPushedScanlatorPrefs.keys()].filter((id) => !(id in map));
  if (removed.length) {
    const { error } = await supabase
      .from("hana_scanlator_preference")
      .delete()
      .eq("user_id", userId)
      .in("manga_id", removed);
    if (!error) for (const id of removed) lastPushedScanlatorPrefs.delete(id);
  }
}

async function pushAllInternal(userId: string): Promise<void> {
  await Promise.allSettled([
    pushLibrary(userId),
    pushProgress(userId),
    pushReadState(userId),
    pushSettings(userId),
    pushScanlatorPrefs(userId),
  ]);
}

export async function pushAll(userId: string): Promise<void> {
  const task = pushAllInternal(userId);
  pendingPushes.add(task);
  try {
    await task;
  } finally {
    pendingPushes.delete(task);
  }
}

async function pullLibrary(userId: string): Promise<void> {
  const supabase = createClient();
  let { data } = await supabase
    .from("hana_library")
    .select("manga_id, manga, added_at, library_status")
    .eq("user_id", userId);
  if (!data) {
    ({ data } = await supabase
      .from("hana_library")
      .select("manga_id, manga, added_at")
      .eq("user_id", userId));
  }
  if (!data || currentUserId !== userId) return;
  lastPushedLibrary.clear();
  for (const row of data as LibraryRow[]) {
    lastPushedLibrary.set(row.manga_id, canonicalJson({
      user_id: userId,
      manga_id: row.manga_id,
      manga: row.manga,
      added_at: row.added_at,
      library_status: row.library_status ?? "to_read",
    }));
  }
  const local = getLibrarySnapshot();
  const merged: LibraryMap = { ...local };
  for (const row of data as LibraryRow[]) {
    const manga = row.manga as LibraryMap[string]["manga"];
    const normalized = manga && manga.id !== row.manga_id ? { ...manga, id: row.manga_id } : manga;
    const existing = local[row.manga_id];
    if (!existing || row.added_at > existing.addedAt) {
      merged[row.manga_id] = {
        manga: normalized,
        addedAt: row.added_at,
        status: row.library_status ?? "to_read",
      };
    } else {
      merged[row.manga_id] = {
        ...existing,
        manga: existing.manga.id !== row.manga_id ? normalized : existing.manga,
        status: row.library_status ?? existing.status ?? "to_read",
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
  if (!data || currentUserId !== userId) return;
  lastPushedProgress.clear();
  for (const row of data as ProgressRow[]) {
    lastPushedProgress.set(row.manga_id, canonicalJson({
      user_id: userId,
      manga_id: row.manga_id,
      chapter_id: row.chapter_id,
      chapter_label: row.chapter_label,
      manga_title: row.manga_title,
      cover_url: row.cover_url ?? null,
      scroll_fraction: row.scroll_fraction,
      manga_fraction: row.manga_fraction ?? null,
      updated_at: row.updated_at,
    }));
  }
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
  const data: ReadStateRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("hana_read_state")
      .select("manga_id, chapter_id, read_at")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error || !page) return;
    data.push(...(page as ReadStateRow[]));
    if (page.length < 1000) break;
  }
  if (currentUserId !== userId) return;
  lastPushedReadState.clear();
  for (const row of data) {
    lastPushedReadState.set(JSON.stringify([row.manga_id, row.chapter_id]), row.read_at);
  }
  const local = getReadSnapshot();
  const merged: ReadMap = structuredClone(local);
  for (const row of data) {
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
    .select("settings, updated_at")
    .eq("user_id", userId)
    .single();
  if (currentUserId !== userId) return;
  if (!data) {
    lastPushedSettings = null;
    return;
  }
  const row = data as SettingsRow;
  lastPushedSettings = canonicalJson({
    user_id: userId,
    settings: row.settings,
    updated_at: row.updated_at,
  });
  const remote = row.settings;
  const remoteUpdatedAt = row.updated_at ?? 0;
  // Don't overwrite a newer local change that hasn't been pushed yet.
  const localUpdatedAt = getReaderSettingsUpdatedAt();
  if (remoteUpdatedAt && localUpdatedAt && remoteUpdatedAt <= localUpdatedAt) {
    // If contents differ but remote is stale, keep local (will be pushed by debounce).
    if (sameJson(getReaderSettings(), remote)) return;
    // Remote is stale and local is newer — skip to avoid reverting fast changes.
    return;
  }
  if (!sameJson(getReaderSettings(), remote)) replaceReaderSettings(remote, remoteUpdatedAt || undefined);
}

async function pullScanlatorPrefs(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_scanlator_preference")
    .select("manga_id, scanlator_id")
    .eq("user_id", userId);
  if (!data || currentUserId !== userId) return;
  lastPushedScanlatorPrefs.clear();
  for (const row of data as ScanlatorRow[]) {
    lastPushedScanlatorPrefs.set(row.manga_id, row.scanlator_id);
  }
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

/** Replace the local library with the current DB contents (prunes merged/deleted rows). */
async function refreshLibrary(userId: string): Promise<void> {
  const supabase = createClient();
  let { data } = await supabase
    .from("hana_library")
    .select("manga_id, manga, added_at, library_status")
    .eq("user_id", userId);
  if (!data) {
    ({ data } = await supabase
      .from("hana_library")
      .select("manga_id, manga, added_at")
      .eq("user_id", userId));
  }
  if (!data || currentUserId !== userId) return;
  const next: LibraryMap = {};
  for (const row of data as LibraryRow[]) {
    next[row.manga_id] = {
      manga: row.manga as LibraryMap[string]["manga"],
      addedAt: row.added_at,
      status: row.library_status ?? "to_read",
    };
  }
  if (!sameJson(getLibrarySnapshot(), next)) replaceLibrary(next);
}

/** Replace the local progress with the current DB contents. */
async function refreshProgress(userId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hana_progress")
    .select("*")
    .eq("user_id", userId);
  if (!data || currentUserId !== userId) return;
  const next: Record<string, ProgressEntry> = {};
  for (const row of data as ProgressRow[]) {
    next[row.manga_id] = {
      mangaId: row.manga_id,
      chapterId: row.chapter_id,
      chapterLabel: row.chapter_label,
      mangaTitle: row.manga_title,
      coverUrl: row.cover_url ?? undefined,
      scrollFraction: row.scroll_fraction,
      mangaFraction: row.manga_fraction ?? undefined,
      updatedAt: row.updated_at,
    };
  }
  if (!sameJson(getAllProgress(), next)) replaceProgress(next);
}

/** Replace the local read state with the current DB contents. */
async function refreshReadState(userId: string): Promise<void> {
  const supabase = createClient();
  const data: ReadStateRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("hana_read_state")
      .select("manga_id, chapter_id, read_at")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error || !page) return;
    data.push(...(page as ReadStateRow[]));
    if (page.length < 1000) break;
  }
  if (currentUserId !== userId) return;
  const next: ReadMap = {};
  for (const row of data) {
    next[row.manga_id] = {
      ...(next[row.manga_id] ?? {}),
      [row.chapter_id]: row.read_at,
    };
  }
  if (!sameJson(getReadSnapshot(), next)) replaceReadState(next);
}

/** Pull remote, merge, then upload the merged state (migrates local data up). */
export async function syncAll(userId: string): Promise<void> {
  await pullAll(userId);
  if (currentUserId === userId) await pushAll(userId);
}

function pushLocalChanges(): void {
  const userId = currentUserId;
  if (!userId || pendingLocalChanges.size === 0) return;
  const changes = [...pendingLocalChanges];
  pendingLocalChanges.clear();
  const tasks = changes.map((change) => {
    switch (change) {
      case LIBRARY_EVENT: return pushLibrary(userId);
      case PROGRESS_EVENT: return pushProgress(userId);
      case READ_EVENT: return pushReadState(userId);
      case READER_SETTINGS_EVENT: return pushSettings(userId);
      case SCANLATOR_PREFERENCE_EVENT: return pushScanlatorPrefs(userId);
      default: return Promise.resolve();
    }
  });
  const task = Promise.allSettled(tasks).then(() => {});
  pendingPushes.add(task);
  void task.finally(() => pendingPushes.delete(task));
}

const localPush = debounce(pushLocalChanges, FLUSH_MS);

const localPushFlush = () => localPush.flush();

function scheduleRealtimePull(
  table: string,
  userId: string,
  pull: (userId: string) => Promise<void>,
): void {
  const existing = realtimePullTimers.get(table);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    realtimePullTimers.delete(table);
    if (currentUserId !== userId) return;
    if (realtimePullsInFlight.has(table)) {
      pendingRealtimePulls.add(table);
      return;
    }
    realtimePullsInFlight.add(table);
    void pull(userId).catch(() => {}).finally(() => {
      realtimePullsInFlight.delete(table);
      if (pendingRealtimePulls.delete(table) && currentUserId === userId) {
        scheduleRealtimePull(table, userId, pull);
      }
    });
  }, 300);
  realtimePullTimers.set(table, timer);
}

function attachLocalListeners(): void {
  const events = [
    LIBRARY_EVENT,
    PROGRESS_EVENT,
    READ_EVENT,
    READER_SETTINGS_EVENT,
    SCANLATOR_PREFERENCE_EVENT,
  ];
  const eventDisposers: Array<() => void> = [];
  for (const event of events) {
    const onLocalChange = () => {
      pendingLocalChanges.add(event);
      localPush();
    };
    window.addEventListener(event, onLocalChange);
    eventDisposers.push(() => window.removeEventListener(event, onLocalChange));
  }
  window.addEventListener(LIBRARY_EVENT, scheduleProviderSync);
  window.addEventListener(READ_EVENT, scheduleProviderSync);
  window.addEventListener("beforeunload", localPushFlush);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      localPushFlush();
      void stopRealtime();
    } else if (currentUserId) {
      setupRealtime(currentUserId);
      scheduleProviderSync();
    }
  };
  window.addEventListener("visibilitychange", onVisibility);
  localDisposers = [
    ...eventDisposers,
    () => window.removeEventListener(LIBRARY_EVENT, scheduleProviderSync),
    () => window.removeEventListener(READ_EVENT, scheduleProviderSync),
    () => window.removeEventListener("beforeunload", localPushFlush),
    () => window.removeEventListener("visibilitychange", onVisibility),
  ];
}

function setupRealtime(userId: string): void {
  if (realtimeChannel || document.visibilityState === "hidden") return;
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
          scheduleRealtimePull("hana_library", userId, pullLibrary);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_progress" },
      (payload: { eventType?: string; old?: { manga_id?: string } | null }) => {
        if (payload.eventType === "DELETE") {
          const removedId = payload.old?.manga_id;
          if (removedId) clearProgress(removedId);
        } else {
          scheduleRealtimePull("hana_progress", userId, pullProgress);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_read_state" },
      (payload: { eventType?: string }) => {
        if (payload.eventType === "DELETE") {
          scheduleRealtimePull("hana_read_state", userId, refreshReadState);
        } else {
          scheduleRealtimePull("hana_read_state", userId, pullReadState);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_reader_settings" },
      () => scheduleRealtimePull("hana_reader_settings", userId, pullSettings),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hana_scanlator_preference" },
      () => scheduleRealtimePull("hana_scanlator_preference", userId, pullScanlatorPrefs),
    )
    .subscribe();
}

async function stopRealtime(): Promise<void> {
  const channel = realtimeChannel;
  realtimeChannel = null;
  for (const timer of realtimePullTimers.values()) clearTimeout(timer);
  realtimePullTimers.clear();
  pendingRealtimePulls.clear();
  if (channel) await channel.unsubscribe();
}

let providerSyncTimer: ReturnType<typeof setTimeout> | undefined;
let providerSyncLast = 0;

async function runProviderSync(): Promise<SyncSummary | null> {
  if (!currentUserId) return null;
  const res = await fetch("/api/integrations/sync", { method: "POST" });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as SyncSummary | null;
}

function scheduleProviderSync(): void {
  if (document.visibilityState === "hidden") return;
  if (providerSyncTimer) return;
  const wait = Math.max(1000, providerSyncLast + 300_000 - Date.now());
  providerSyncTimer = setTimeout(() => {
    providerSyncTimer = undefined;
    if (document.visibilityState === "hidden") return;
    providerSyncLast = Date.now();
    void runProviderSync().catch(() => {});
  }, wait);
}

export async function syncNow(): Promise<SyncSummary | null> {
  if (!currentUserId) return null;
  await syncAll(currentUserId);
  providerSyncLast = Date.now();
  const summary = await runProviderSync().catch(() => null);
  await Promise.allSettled([
    refreshLibrary(currentUserId),
    refreshProgress(currentUserId),
    refreshReadState(currentUserId),
  ]);
  return summary;
}

function switchAccountStores(userId: string | null): void {
  // Make every local cache account-isolated so data never bleeds
  // between accounts and logged-in progress is independent from the
  // anonymous localStorage bucket. Each store keeps a per-user key
  // like `hana:progress:<userId>`; switching clears the in-memory
  // cache so the next read hits the correct key (or an empty map on
  // a fresh device that will be populated from Supabase).
  setStorageUserId(userId);
  clearFetchJsonCache();
  setProgressUserId(userId);
  setReaderSettingsUserId(userId);
  lastPushedLibrary.clear();
  lastPushedProgress.clear();
  lastPushedReadState.clear();
  lastPushedScanlatorPrefs.clear();
  lastPushedSettings = null;
  pendingLocalChanges.clear();
}

async function changeAccount(
  userId: string | null,
): Promise<void> {
  if (userId === currentUserId) return;
  // Stop the debounce timer and wait for every old-account write before
  // changing the storage namespace. Otherwise an in-flight write can read the
  // newly selected account's local state and upload it to the old account.
  localPush.flush();
  await Promise.allSettled([...pendingPushes]);
  await stopRealtime();
  for (const dispose of localDisposers) dispose();
  localDisposers = [];
  // Switch local stores before any pull/push so we read/write the
  // correct per-account bucket and never merge anon data into an
  // account or leak one account's data into another.
  switchAccountStores(userId);
  currentUserId = userId;
  for (const event of [LIBRARY_EVENT, PROGRESS_EVENT, CONTINUE_HERO_EVENT, READ_EVENT, READER_SETTINGS_EVENT, SCANLATOR_PREFERENCE_EVENT]) {
    window.dispatchEvent(new CustomEvent(event));
  }
  if (userId) {
    await syncAll(userId);
    attachLocalListeners();
    setupRealtime(userId);
  }
}

// Serialize auth callbacks so a slow restoration cannot select an older account.
let accountChange: Promise<void> = Promise.resolve();
export function handleAuthStateChange(userId: string | null): Promise<void> {
  accountChange = accountChange.catch(() => {}).then(() => changeAccount(userId));
  return accountChange;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export async function refreshSession(): Promise<string | null> {
  if (ACCOUNT_MAINTENANCE) return null;
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
