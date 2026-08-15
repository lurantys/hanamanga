import { createClient } from "@/lib/supabase/server";
import {
  anilistToManga,
  ANILIST_MEDIA_FIELDS,
  fetchAniListByMalIds,
  fetchAniListViewerId,
  type AniListMedia,
} from "@/lib/anilist";
import type { Manga } from "@/lib/mangadex";
import { normalizeTitleKey, titleHits } from "@/lib/title";

export type ProviderName = "anilist" | "mal";

export type ProviderState = Record<
  string,
  { status?: string; progress?: number; syncedAt?: number; error?: string } | undefined
>;

export type ProviderSyncResult = {
  provider: ProviderName;
  additions: number;
  progressUpdates: number;
  pulled: number;
  removed: number;
  unmatched?: number;
  error?: string;
};

export type SyncSummary = {
  syncedAt: number;
  providers: ProviderSyncResult[];
};

const ANILIST_API = "https://graphql.anilist.co";
const MAL_API = "https://api.myanimelist.net/v2";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

const MAL_TO_ANILIST_STATUS: Record<string, string> = {
  reading: "CURRENT",
  completed: "COMPLETED",
  on_hold: "PAUSED",
  dropped: "DROPPED",
  plan_to_read: "PLANNING",
  repeating: "REPEATING",
};

const ANILIST_TO_MAL_STATUS: Record<string, string> = {
  CURRENT: "reading",
  COMPLETED: "completed",
  PAUSED: "on_hold",
  DROPPED: "dropped",
  PLANNING: "plan_to_read",
  REPEATING: "repeating",
};

class ProviderError extends Error {
  status: number;
  transient: boolean;
  constructor(message: string, status: number, transient: boolean) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.transient = transient;
  }
}

function parseChapterNumber(label: string): number | null {
  const lower = label.toLowerCase();
  const match =
    lower.match(/(?:^|\D)(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/) ??
    lower.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : null;
}

async function anilistFetch<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Hana/1.0",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError("AniList network error", 0, true);
  }
  if (!res.ok) {
    throw new ProviderError(`AniList ${res.status}`, res.status, true);
  }
  const json = (await res.json().catch(() => null)) as {
    data?: T;
    errors?: { status?: number; message?: string }[];
  } | null;
  const error = json?.errors?.[0];
  if (error) {
    throw new ProviderError(
      `AniList: ${error.message ?? "request failed"}`,
      error.status ?? 400,
      false,
    );
  }
  if (!json?.data) {
    throw new ProviderError("AniList returned no data", 500, true);
  }
  return json.data;
}

function malTransient(status: number): boolean {
  return status === 0 || status === 401 || status === 429 || status >= 500;
}

async function malFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ProviderError("MAL network error", 0, true);
  }
}

const SAVE_MUTATION = /* GraphQL */ `
  mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
    SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) { id }
  }
`;

const ANILIST_LIST_QUERY = /* GraphQL */ `
  query ($userId: Int) {
    MediaListCollection(userId: $userId, type: MANGA) {
      lists {
        entries {
          status
          progress
          media { ${ANILIST_MEDIA_FIELDS} }
        }
      }
    }
  }
`;

async function fetchAniListEntries(token: string): Promise<{ manga: Manga; status?: string; progress?: number }[]> {
  const userId = await fetchAniListViewerId(token);
  const data = await anilistFetch<{
    MediaListCollection?: {
      lists?: { entries?: ({ status?: string | null; progress?: number | null; media?: AniListMedia | null })[] | null }[] | null;
    } | null;
  }>(token, ANILIST_LIST_QUERY, { userId });
  const entries =
    data.MediaListCollection?.lists?.flatMap((list) => list.entries ?? []) ?? [];
  return entries
    .filter(
      (entry) =>
        Boolean(entry.media) &&
        !entry.media?.isAdult &&
        entry.media?.format !== "NOVEL" &&
        entry.media?.format !== "ONE_SHOT",
    )
    .map((entry) => ({
      manga: anilistToManga(entry.media!),
      status: entry.status ?? undefined,
      progress: entry.progress ?? undefined,
    }));
}

async function saveAniListEntry(
  token: string,
  mediaId: number,
  status: string,
  progress: number | null,
): Promise<void> {
  const variables: Record<string, unknown> = { mediaId, status };
  if (progress != null) variables.progress = progress;
  await anilistFetch(token, SAVE_MUTATION, variables);
}

type MalMangaList = {
  data?: {
    node?: {
      id?: number;
      my_list_status?: { status?: string; num_chapters_read?: number };
    };
  }[];
  paging?: { next?: string | null };
};

async function fetchMalEntries(
  token: string,
): Promise<{
  entries: { manga: Manga; status?: string; progress?: number }[];
  unmatched: number;
}> {
  const items: { malId: number; status?: string; progress?: number }[] = [];
  let next: string | null = `${MAL_API}/users/@me/mangalist?fields=my_list_status&limit=100`;
  let guard = 0;
  while (next && guard < 20) {
    guard++;
    const res = await malFetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ProviderError(`MAL list ${res.status}`, res.status, malTransient(res.status));
    const json = (await res.json()) as MalMangaList;
    for (const entry of json.data ?? []) {
      if (typeof entry.node?.id === "number") {
        items.push({
          malId: entry.node.id,
          status: entry.node.my_list_status?.status,
          progress: entry.node.my_list_status?.num_chapters_read,
        });
      }
    }
    next = json.paging?.next ?? null;
  }

  const byMalId = new Map<number, Manga>();
  for (const manga of await fetchAniListByMalIds(items.map((item) => item.malId))) {
    const malId = manga.links?.mal ? Number(manga.links.mal) : NaN;
    if (Number.isFinite(malId)) byMalId.set(malId, manga);
  }
  const entries: { manga: Manga; status?: string; progress?: number }[] = [];
  let unmatched = 0;
  for (const item of items) {
    const manga = byMalId.get(item.malId);
    if (manga) entries.push({ manga, status: item.status, progress: item.progress });
    else unmatched++;
  }
  return { entries, unmatched };
}

async function patchMalEntry(
  token: string,
  malId: number,
  status: string,
  progress: number | null,
): Promise<void> {
  const body = new URLSearchParams({ status });
  if (progress != null) body.set("num_chapters_read", String(progress));
  const res = await malFetch(`${MAL_API}/manga/${malId}/my_list_status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new ProviderError(`MAL patch ${res.status}`, res.status, malTransient(res.status));
}

export type OAuthRow = {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function getMalAccessToken(userId: string, row: OAuthRow): Promise<string> {
  if (!row.refresh_token) return row.access_token;
  const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expires && expires - Date.now() > 5 * 60 * 1000) return row.access_token;
  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return row.access_token;
  const res = await malFetch(MAL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !json.access_token) return row.access_token;
  const supabase = await createClient();
  await supabase
    .from("hana_oauth")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expires_at: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "mal");
  return json.access_token;
}

async function computeChaptersRead(userId: string, mangaId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("hana_progress")
    .select("chapter_label")
    .eq("user_id", userId)
    .eq("manga_id", mangaId)
    .maybeSingle();
  if (progress?.chapter_label) {
    const parsed = parseChapterNumber(progress.chapter_label as string);
    if (parsed != null) return parsed;
  }
  const { count } = await supabase
    .from("hana_read_state")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("manga_id", mangaId);
  return count && count > 0 ? count : null;
}

type LibraryRow = {
  manga_id: string;
  manga: unknown;
  added_at: number;
  provider_state: ProviderState | null;
};

async function readLibrary(userId: string): Promise<Map<string, LibraryRow>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hana_library")
    .select("manga_id, manga, added_at, provider_state")
    .eq("user_id", userId);
  const map = new Map<string, LibraryRow>();
  for (const row of (data ?? []) as LibraryRow[]) {
    map.set(row.manga_id, row);
  }
  return map;
}

async function setProviderState(
  userId: string,
  mangaId: string,
  state: ProviderState,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("hana_library")
    .update({ provider_state: state })
    .eq("user_id", userId)
    .eq("manga_id", mangaId);
}

function providerIdFor(provider: ProviderName, manga: Manga): number | null {
  const raw = provider === "anilist" ? manga.links?.al : manga.links?.mal;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

async function pushToProvider(
  userId: string,
  provider: ProviderName,
  token: string,
): Promise<{ additions: number; progressUpdates: number }> {
  const library = await readLibrary(userId);
  let additions = 0;
  let progressUpdates = 0;

  for (const row of library.values()) {
    const manga = (row.manga ?? {}) as Manga;
    const state: ProviderState = row.provider_state ?? {};
    const existing = state[provider];
    if (existing?.error) continue;

    const mediaId = providerIdFor(provider, manga);
    if (mediaId == null) continue;

    const progress = await computeChaptersRead(userId, row.manga_id);

    try {
      if (!existing) {
        const status =
          provider === "anilist"
            ? (state.mal?.status ? MAL_TO_ANILIST_STATUS[state.mal.status] : undefined) ??
              "CURRENT"
            : (state.anilist?.status ? ANILIST_TO_MAL_STATUS[state.anilist.status] : undefined) ??
              "reading";
        if (provider === "anilist") {
          await saveAniListEntry(token, mediaId, status, progress);
        } else {
          await patchMalEntry(token, mediaId, status, progress);
        }
        await setProviderState(userId, row.manga_id, {
          ...state,
          [provider]: { status, progress: progress ?? undefined, syncedAt: Date.now() },
        });
        additions++;
      } else if (progress != null && existing.progress !== progress) {
        const status = existing.status ?? (provider === "anilist" ? "CURRENT" : "reading");
        if (provider === "anilist") {
          await saveAniListEntry(token, mediaId, status, progress);
        } else {
          await patchMalEntry(token, mediaId, status, progress);
        }
        await setProviderState(userId, row.manga_id, {
          ...state,
          [provider]: { ...existing, progress, syncedAt: Date.now() },
        });
        progressUpdates++;
      }
    } catch (error) {
      console.error(`[provider-sync] push ${provider} failed for ${row.manga_id}`, error);
      if (!existing && error instanceof ProviderError && !error.transient) {
        await setProviderState(userId, row.manga_id, {
          ...state,
          [provider]: {
            error: error.message.slice(0, 200),
            syncedAt: Date.now(),
          },
        });
      }
    }
  }

  return { additions, progressUpdates };
}

async function pullFromProvider(
  userId: string,
  provider: ProviderName,
  token: string,
  syncedAt: number,
): Promise<{ pulled: number; removed: number; unmatched?: number }> {
  const supabase = await createClient();
  const fetched =
    provider === "anilist"
      ? { entries: await fetchAniListEntries(token), unmatched: 0 }
      : await fetchMalEntries(token);
  const { entries, unmatched } = fetched;
  const library = await readLibrary(userId);

  const byAl = new Map<string, LibraryRow>();
  const byMal = new Map<string, LibraryRow>();
  const unlinkedRows: LibraryRow[] = [];
  for (const row of library.values()) {
    const manga = row.manga as Manga;
    if (manga?.links?.al && !byAl.has(manga.links.al)) byAl.set(manga.links.al, row);
    if (manga?.links?.mal && !byMal.has(manga.links.mal)) byMal.set(manga.links.mal, row);
    if (!manga?.links?.al && !manga?.links?.mal) unlinkedRows.push(row);
  }

  const findExisting = (entry: { manga: Manga }): LibraryRow | undefined => {
    const manga = entry.manga;
    const exact = library.get(manga.id);
    if (exact) return exact;
    if (manga.links?.al) {
      const found = byAl.get(manga.links.al);
      if (found) return found;
    }
    if (manga.links?.mal) {
      const found = byMal.get(manga.links.mal);
      if (found) return found;
    }
    for (const row of unlinkedRows) {
      if (sameWorkByTitle(manga, row.manga as Manga)) return row;
    }
    return undefined;
  };

  const upserts: {
    user_id: string;
    manga_id: string;
    manga: unknown;
    added_at: number;
    provider_state: ProviderState;
  }[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const mangaId = entry.manga.id;
    const existing = findExisting(entry);
    const targetId = existing?.manga_id ?? mangaId;
    seen.add(targetId);

    const state: ProviderState = existing?.provider_state ?? {};
    const prev = state[provider];
    upserts.push({
      user_id: userId,
      manga_id: targetId,
      manga: entry.manga,
      added_at: existing?.added_at ?? Date.now(),
      provider_state: {
        ...state,
        [provider]: {
          status: entry.status ?? prev?.status,
          progress: entry.progress ?? prev?.progress,
          syncedAt,
        },
      },
    });
  }

  if (upserts.length) {
    await supabase.from("hana_library").upsert(upserts, {
      onConflict: "user_id,manga_id",
    });
  }

  const toDelete: string[] = [];
  for (const [mangaId, row] of library) {
    const state: ProviderState = row.provider_state ?? {};
    const st = state[provider];
    if (st && !st.error && !seen.has(mangaId)) toDelete.push(mangaId);
  }
  if (toDelete.length) {
    await supabase
      .from("hana_library")
      .delete()
      .eq("user_id", userId)
      .in("manga_id", toDelete);
  }
  return {
    pulled: upserts.length,
    removed: toDelete.length,
    unmatched: unmatched || undefined,
  };
}

async function moveProgressData(
  userId: string,
  fromId: string,
  toId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: fromProg } = await supabase
    .from("hana_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("manga_id", fromId)
    .maybeSingle();
  const { data: toProg } = await supabase
    .from("hana_progress")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("manga_id", toId)
    .maybeSingle();
  if (
    fromProg &&
    (!toProg?.updated_at || (fromProg as { updated_at: number }).updated_at > (toProg as { updated_at: number }).updated_at)
  ) {
    const rest = { ...(fromProg as Record<string, unknown>) };
    delete rest.id;
    delete rest.created_at;
    await supabase
      .from("hana_progress")
      .upsert({ ...rest, manga_id: toId }, { onConflict: "user_id,manga_id" });
  }

  const { data: fromRead } = await supabase
    .from("hana_read_state")
    .select("chapter_id, read_at")
    .eq("user_id", userId)
    .eq("manga_id", fromId);
  if (fromRead?.length) {
    const { data: toRead } = await supabase
      .from("hana_read_state")
      .select("chapter_id, read_at")
      .eq("user_id", userId)
      .eq("manga_id", toId);
    const existingRead = new Map(
      ((toRead ?? []) as { chapter_id: string; read_at: number }[]).map((row) => [
        row.chapter_id,
        row.read_at,
      ]),
    );
    for (const row of fromRead as { chapter_id: string; read_at: number }[]) {
      const prev = existingRead.get(row.chapter_id);
      if (prev === undefined || row.read_at > prev) {
        await supabase
          .from("hana_read_state")
          .upsert(
            {
              user_id: userId,
              manga_id: toId,
              chapter_id: row.chapter_id,
              read_at: row.read_at,
            },
            { onConflict: "user_id,manga_id,chapter_id" },
          );
      }
    }
  }

  await supabase
    .from("hana_progress")
    .delete()
    .eq("user_id", userId)
    .eq("manga_id", fromId);
  await supabase
    .from("hana_read_state")
    .delete()
    .eq("user_id", userId)
    .eq("manga_id", fromId);
  await supabase
    .from("hana_scanlator_preference")
    .delete()
    .eq("user_id", userId)
    .eq("manga_id", fromId);
}

function isLinkedManga(manga: Manga | null | undefined): boolean {
  return Boolean(manga?.links?.al || manga?.links?.mal);
}

/** Whether two manga are the same work by title, tolerating variant titles. */
function sameWorkByTitle(a: Manga | null | undefined, b: Manga | null | undefined): boolean {
  const titles = (m: Manga | null | undefined): string[] =>
    [m?.title, ...(m?.altTitles ?? [])].filter((v): v is string => Boolean(v));
  const at = titles(a);
  const bt = titles(b);
  for (const x of at) {
    for (const y of bt) {
      const kx = normalizeTitleKey(x);
      const ky = normalizeTitleKey(y);
      if (!kx || !ky) continue;
      if (kx === ky) return true;
      const tx = kx.split(" ").filter((token) => token.length > 2);
      const ty = ky.split(" ").filter((token) => token.length > 2);
      if (tx.length < 2 || ty.length < 2) continue;
      if (titleHits(x, [y])) return true;
    }
  }
  return false;
}

/** Collapse library rows that refer to the same work into one. */
async function dedupeByAl(
  userId: string,
  library: Map<string, LibraryRow>,
  keepIds: Set<string>,
): Promise<void> {
  const supabase = await createClient();
  const rows = [...library.values()];

  const isLinked = (row: LibraryRow): boolean =>
    isLinkedManga(row.manga as Manga);

  const { data: progressRows } = await supabase
    .from("hana_progress")
    .select("manga_id")
    .eq("user_id", userId);
  const progressIds = new Set(
    ((progressRows ?? []) as { manga_id: string }[]).map((row) => row.manga_id),
  );
  const { data: readRows } = await supabase
    .from("hana_read_state")
    .select("manga_id")
    .eq("user_id", userId);
  const readIds = new Set(
    ((readRows ?? []) as { manga_id: string }[]).map((row) => row.manga_id),
  );

  const connects = (a: LibraryRow, b: LibraryRow): boolean => {
    const ma = a.manga as Manga;
    const mb = b.manga as Manga;
    if (ma?.links?.al && ma.links.al === mb?.links?.al) return true;
    if (ma?.links?.mal && ma.links.mal === mb?.links?.mal) return true;
    // A title-only connection is only followed when at least one side is
    // unlinked, so distinct linked works sharing a title never merge.
    if (isLinked(a) && isLinked(b)) return false;
    return sameWorkByTitle(ma, mb);
  };

  const visited = new Set<string>();
  for (const row of rows) {
    if (visited.has(row.manga_id)) continue;
    const component: LibraryRow[] = [];
    const queue: LibraryRow[] = [row];
    visited.add(row.manga_id);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const candidate of rows) {
        if (visited.has(candidate.manga_id)) continue;
        if (connects(current, candidate)) {
          visited.add(candidate.manga_id);
          queue.push(candidate);
        }
      }
    }
    if (component.length < 2) continue;
    if (!component.some(isLinked)) continue;

    const keeper =
      component.find((r) => keepIds.has(r.manga_id)) ??
      component.reduce((best, r) => {
        const score = (candidate: LibraryRow) =>
          (progressIds.has(candidate.manga_id) || readIds.has(candidate.manga_id) ? 2 : 0) +
          (candidate.provider_state && Object.keys(candidate.provider_state).length ? 1 : 0);
        const a = score(r);
        const b = score(best);
        if (a !== b) return a > b ? r : best;
        const aAl = Boolean((r.manga as Manga)?.links?.al);
        const bAl = Boolean((best.manga as Manga)?.links?.al);
        if (aAl !== bAl) return aAl ? r : best;
        return (r.added_at ?? 0) < (best.added_at ?? 0) ? r : best;
      }, component[0]);
    for (const candidate of component) {
      if (candidate.manga_id === keeper.manga_id) continue;
      await moveProgressData(userId, candidate.manga_id, keeper.manga_id);
      await supabase
        .from("hana_library")
        .delete()
        .eq("user_id", userId)
        .eq("manga_id", candidate.manga_id);
    }
  }
}

async function syncProvider(
  userId: string,
  provider: ProviderName,
  oauth: OAuthRow,
  syncedAt: number,
): Promise<ProviderSyncResult> {
  const supabase = await createClient();
  const token =
    provider === "mal" ? await getMalAccessToken(userId, oauth) : oauth.access_token;

  let pullResult: { pulled: number; removed: number; unmatched?: number } = {
    pulled: 0,
    removed: 0,
  };
  let pushResult = { additions: 0, progressUpdates: 0 };
  let error: string | undefined;

  try {
    pullResult = await pullFromProvider(userId, provider, token, syncedAt);
  } catch (err) {
    console.error(`[provider-sync] ${provider} pull failed`, err);
    error = err instanceof Error ? err.message : "pull failed";
  }

  try {
    pushResult = await pushToProvider(userId, provider, token);
  } catch (err) {
    console.error(`[provider-sync] ${provider} push failed`, err);
    error ??= err instanceof Error ? err.message : "push failed";
  }

  if (!error) {
    await supabase
      .from("hana_oauth")
      .update({ synced_at: new Date(syncedAt).toISOString() })
      .eq("user_id", userId)
      .eq("provider", provider);
  }
  return { provider, ...pushResult, ...pullResult, error };
}

export async function syncProviders(userId: string): Promise<SyncSummary> {
  const supabase = await createClient();

  try {
    const library = await readLibrary(userId);
    await dedupeByAl(userId, library, new Set<string>());
  } catch (error) {
    console.error("[provider-sync] library dedupe failed", error);
  }

  const { data } = await supabase
    .from("hana_oauth")
    .select("user_id, provider, access_token, refresh_token, expires_at")
    .eq("user_id", userId);

  const syncedAt = Date.now();
  const results: ProviderSyncResult[] = [];

  for (const provider of ["anilist", "mal"] as const) {
    const row = (data ?? []).find((r: OAuthRow) => r.provider === provider) ?? null;
    if (!row) continue;
    try {
      results.push(await syncProvider(userId, provider, row, syncedAt));
    } catch (error) {
      console.error(`[provider-sync] ${provider} sync failed`, error);
      results.push({
        provider,
        additions: 0,
        progressUpdates: 0,
        pulled: 0,
        removed: 0,
        error: error instanceof Error ? error.message : "sync failed",
      });
    }
  }

  return { syncedAt, providers: results };
}
