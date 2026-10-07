"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { AniListIcon, MalIcon } from "@/components/BrandIcons";
import { useAuth, getDisplayName } from "@/lib/auth";
import { RouteSkeleton } from "@/components/RouteSkeleton";
import { CustomSelect } from "@/components/CustomSelect";
import { LoadingIcon } from "@/components/LoadingIcon";
import {
  DEFAULT_READER_SETTINGS,
  getReaderSettings,
  setReaderSettings,
  subscribeReaderSettings,
  type ReaderMode,
  type ReaderDirection,
} from "@/lib/reader-settings";
import { syncNow } from "@/lib/sync";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
import { EmailIcon, GoogleIcon, SignInIcon, SignOutIcon } from "@/components/AuthIcons";
import type { SyncSummary } from "@/lib/provider-sync";
import type { User } from "@supabase/supabase-js";
import { getLibrarySnapshot, subscribeLibrary } from "@/lib/library";
import { getAllProgress, subscribeProgress } from "@/lib/progress";
import {
  getFinishedSnapshot,
  getReadSnapshot,
  subscribeFinished,
  subscribeReadState,
} from "@/lib/read-state";

type IntegrationStatus = "idle" | "checking" | "connected" | "not_configured";

type IntegrationState = {
  status: IntegrationStatus;
  syncedAt: string | null;
};

type ProviderId = "anilist" | "mal";

const PROVIDERS: {
  provider: ProviderId;
  name: string;
  description: string;
  href: string;
  tileClass: string;
}[] = [
  {
    provider: "anilist",
    name: "AniList",
    description: "Sync your manga list both ways.",
    href: "/api/integrations/anilist",
    tileClass: "bg-zinc-800",
  },
  {
    provider: "mal",
    name: "MyAnimeList",
    description: "Sync your MAL manga list both ways.",
    href: "/api/integrations/mal",
    tileClass: "bg-zinc-800",
  },
];

function useIntegrationStatus(
  provider: string,
  refreshKey: number,
): IntegrationState {
  const [state, setState] = useState<IntegrationState>({
    status: "checking",
    syncedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/integrations/${provider}/status`)
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json().catch(() => null)) as {
          connected?: boolean;
          configured?: boolean;
          syncedAt?: string | null;
        } | null;
        const syncedAt = json?.syncedAt ?? null;
        if (json?.connected) setState({ status: "connected", syncedAt });
        else if (json?.configured === false)
          setState({ status: "not_configured", syncedAt: null });
        else setState({ status: "idle", syncedAt: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "idle", syncedAt: null });
      });
    return () => {
      cancelled = true;
    };
  }, [provider, refreshKey]);

  return state;
}

function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ProviderLogo({
  provider,
  className = "h-6 w-6",
}: {
  provider: ProviderId;
  className?: string;
}) {
  return provider === "anilist" ? (
    <AniListIcon className={className} />
  ) : (
    <MalIcon className={className} />
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SyncIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export default function AccountContent() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewMode = searchParams.get("preview") === "1";
  const previewUser = {
    id: "hana-local-preview",
    email: "reader@hana.local",
    user_metadata: { display_name: "Hana Reader" },
    identities: [{ provider: "email" }, { provider: "google" }],
  } as unknown as User;
  const user = previewMode ? previewUser : auth.user;
  const loading = previewMode ? false : auth.loading;
  const signOut = previewMode ? async () => {} : auth.signOut;
  const updateDisplayName = previewMode
    ? async () => ({ error: "Preview mode: profile changes are disabled." })
    : auth.updateDisplayName;
  const avatar = useProviderAvatar(previewMode ? null : user?.id ?? null);
  const importOk = searchParams.get("import");
  const error = searchParams.get("error");
  const importCount = searchParams.get("count");

  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const anilist = useIntegrationStatus("anilist", refreshKey);
  const mal = useIntegrationStatus("mal", refreshKey);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [libraryStats, setLibraryStats] = useState({ total: 0, reading: 0, finished: 0, chapters: 0 });

  const displayName = getDisplayName(user);
  const readerSettings = useSyncExternalStore(
    subscribeReaderSettings,
    getReaderSettings,
    () => DEFAULT_READER_SETTINGS,
  );
  const memberSince = user?.created_at && Number.isFinite(Date.parse(user.created_at))
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Africa/Casablanca" }).format(new Date(user.created_at))
    : "Not available";
  const signInMethods = [...new Set(user?.identities?.map(({ provider }) => provider) ?? [])];

  useEffect(() => {
    const updateStats = () => {
      const library = getLibrarySnapshot();
      const entries = Object.values(library);
      const finishedIds = new Set([
        ...Object.keys(getFinishedSnapshot()),
        ...entries
          .filter(({ status }) => status === "read")
          .map(({ manga }) => manga.id),
      ]);
      const readingIds = new Set([
        ...entries
          .filter(({ status, manga }) =>
            status === "reading" && !finishedIds.has(manga.id),
          )
          .map(({ manga }) => manga.id),
        ...Object.values(getAllProgress())
          .filter(({ mangaId }) =>
            !finishedIds.has(mangaId) && library[mangaId]?.status !== "read",
          )
          .map(({ mangaId }) => mangaId),
      ]);
      const chapters = Object.values(getReadSnapshot()).reduce(
        (total, manga) => total + Object.keys(manga).length,
        0,
      );
      setLibraryStats({
        total: entries.length,
        reading: readingIds.size,
        finished: finishedIds.size,
        chapters,
      });
    };
    updateStats();
    const unsubscribeLibrary = subscribeLibrary(updateStats);
    const unsubscribeRead = subscribeReadState(updateStats);
    const unsubscribeProgress = subscribeProgress(updateStats);
    const unsubscribeFinished = subscribeFinished(updateStats);
    return () => {
      unsubscribeLibrary();
      unsubscribeRead();
      unsubscribeProgress();
      unsubscribeFinished();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const importedCount = importCount ? Number.parseInt(importCount, 10) : null;

  useEffect(() => {
    if (!user) return;
    if (importOk === "anilist" || importOk === "mal") {
      void syncNow()
        .then((summary) => setLastSummary(summary))
        .catch(() => {});
    }
  }, [importOk, user]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncNow();
      setLastSummary(result);
      const providers = result?.providers ?? [];
      const errors = providers.filter((p) => p.error);
      const unmatched = providers
        .filter((p) => p.unmatched)
        .map((p) => `${p.provider}: ${p.unmatched}`);
      if (errors.length) {
        const anilistError = providers.find(
          (p) => p.provider === "anilist" && p.error,
        )?.error;
        const isDown = anilistError
          ? /temporarily disabled|severe stability issues/i.test(anilistError)
          : false;
        setSyncResult(
          isDown
            ? "AniList is temporarily down due to stability issues. Your local library is safe — sync will work again once AniList is back."
            : `Synced, but ${errors
                .map((p) =>
                  `${p.provider === "mal" ? "MAL" : "AniList"} failed: ${p.error}`,
                )
                .join(", ")}.`,
        );
      } else if (unmatched.length) {
        setSyncResult(
          `Synced. ${unmatched.join(
            "; ",
          )} titles on your list have no AniList match and were skipped.`,
        );
      } else {
        setSyncResult(
          "Library, progress, and connected services (AniList/MAL) synced.",
        );
      }
      setRefreshKey((key) => key + 1);
    } catch {
      setSyncResult("Sync failed — try again.");
    } finally {
      setSyncing(false);
    }
  }, [setSyncing, setSyncResult, setLastSummary, setRefreshKey]);

  if (loading) return <RouteSkeleton kind="account" />;

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 pb-24 pt-32 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Not signed in
        </h1>
        <p className="max-w-sm text-sm text-zinc-400">
          Sign in to sync your library across devices and import from other
          services.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
        >
          <SignInIcon className="h-4 w-4" />
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-header sm:px-6 lg:px-8">
        <header className="grid items-start gap-7 border-b border-white/10 pb-7 sm:gap-8 sm:pb-8 lg:grid-cols-2 lg:gap-5">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-base font-bold text-zinc-200 sm:h-24 sm:w-24">
              {avatar?.url ? (
                <Image
                  src={avatar.url}
                  alt={user.email ?? "Account"}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  {(displayName ?? user.email ?? "U").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">Your Hana account</p>
              <div className="flex items-center gap-2">
                <h1 className="truncate text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {displayName ?? "Account"}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNameValue(displayName ?? "");
                    setEditingName(true);
                    setNameError(null);
                  }}
                  aria-label="Edit display name"
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              </div>
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNameSaving(true);
                    setNameError(null);
                    void updateDisplayName(nameValue).then(({ error }) => {
                      setNameSaving(false);
                      if (error) {
                        setNameError(error);
                      } else {
                        setEditingName(false);
                      }
                    });
                  }}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input
                    autoFocus
                    aria-label="Display name"
                    maxLength={80}
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="min-w-0 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1 text-[16px] text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 hover:border-white/25 focus:border-red-400/50 sm:text-sm"
                    placeholder="Display name"
                  />
                  <button
                    type="submit"
                    disabled={nameSaving}
                    className="text-xs font-semibold text-red-400 transition-colors duration-200 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {nameSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameError(null);
                    }}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                  {nameError && (
                    <span className="text-xs text-red-400">{nameError}</span>
                  )}
                </form>
              ) : (
                <p className="mt-1.5 break-all text-sm text-zinc-400">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-900/25 p-5" aria-labelledby="reading-stats-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="reading-stats-heading" className="text-sm font-semibold text-white">Reading stats</h2>
              <Link href="/library" className="rounded text-xs text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Open library <span aria-hidden>↗</span></Link>
            </div>
            <dl className="grid grid-cols-2">
              {[
                { value: libraryStats.total, label: "Titles saved" },
                { value: libraryStats.reading, label: "Currently reading" },
                { value: libraryStats.finished, label: "Completed" },
                { value: libraryStats.chapters, label: "Chapters read" },
              ].map(({ value, label }, index) => (
                <div
                  key={label}
                  className={`flex min-w-0 flex-col-reverse gap-1.5 py-3 ${index % 2 === 1 ? "border-l border-white/[0.07] pl-5" : "pr-5"} ${index > 1 ? "border-t border-white/[0.07]" : ""}`}
                >
                  <dt className="text-xs text-zinc-400">{label}</dt>
                  <dd className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-white">{value.toLocaleString("en")}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">Reading and completion counts include titles outside your saved library.</p>
          </section>
        </header>

        {importOk && error ? (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "api_error_403" || error === "api_error_500"
              ? "The provider API is currently unavailable — try again later."
              : `Could not import your ${
                  importOk === "anilist" ? "AniList" : "MyAnimeList"
                } list. Please try again.`}
          </p>
        ) : importOk ? (
          <p className="mt-6 rounded-lg border border-white/15 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100">
            {importedCount !== null && importedCount > 0
              ? `Imported ${importedCount} title${
                  importedCount === 1 ? "" : "s"
                } from your ${
                  importOk === "anilist" ? "AniList" : "MyAnimeList"
                } list — check your library.`
              : `Your ${
                  importOk === "anilist" ? "AniList" : "MyAnimeList"
                } list was empty.`}
          </p>
        ) : null}
        {error && !importOk && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "mal_state_failed" || error === "anilist_state_failed"
              ? "The connection request expired or was interrupted — please try again."
              : error === "mal_token_failed" ||
                  error === "anilist_token_failed"
                ? "The service could not connect to Hana. Please try again later."
                : error === "sign_in_required"
                  ? "Please sign in first, then connect the service."
                  : `Something went wrong connecting that service (${error}). Please try again.`}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:mt-9 lg:grid-cols-2 lg:gap-5">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/55 px-5 py-4 sm:px-6 lg:col-span-2" aria-labelledby="cloud-sync-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400">
                  <SyncIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2 id="cloud-sync-heading" className="text-sm font-semibold text-white">Cloud sync</h2>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    Your library, progress, and reader preferences sync automatically across devices.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex shrink-0 self-start items-center justify-center gap-2 rounded-lg sm:self-center border border-white/15 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-red-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {syncing ? (
                  <>
                    <LoadingIcon className="h-4 w-4" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <SyncIcon className="h-3.5 w-3.5" />
                    Sync now
                  </>
                )}
              </button>
            </div>

            {syncResult && (
              <div
                aria-live="polite"
                className="mt-4 border-t border-white/10 pt-4"
              >
                {lastSummary && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {lastSummary.providers.map((provider) => (
                      <span
                        key={provider.provider}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          provider.error
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-white/15 bg-zinc-900/60 text-zinc-200"
                        }`}
                      >
                          {provider.error ? (
                            <CheckIcon className="h-3 w-3 rotate-45 text-red-400" />
                          ) : (
                            <CheckIcon className="h-3 w-3 text-emerald-400" />
                        )}
                        {provider.provider === "anilist"
                          ? "AniList"
                          : "MyAnimeList"}{" "}
                        {provider.error ? "failed" : "synced"}
                      </span>
                    ))}
                  </div>
                )}
                <p
                  className={`text-sm ${
                    syncResult.startsWith("Synced,")
                      ? "text-red-300"
                      : "text-zinc-300"
                  }`}
                >
                  {syncResult}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/55 p-5 sm:p-6" aria-labelledby="account-details-heading">
            <h2 id="account-details-heading" className="text-lg font-bold text-white">Account details</h2>
            <p className="mt-1 text-sm text-zinc-400">Your profile and sign-in information.</p>
            <dl className="mt-5 divide-y divide-white/10">
              {[
                ["Email", user.email ?? "Not available"],
                ["Email status", user.email_confirmed_at ? "Verified" : "Not verified"],
                ["Member since", memberSince],
                ["Sign-in method", signInMethods.join(", ") || "Not available"],
                ["Profile picture", avatar?.provider === "anilist" ? "From AniList" : avatar?.provider === "mal" ? "From MyAnimeList" : "Hana initial"],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="min-w-0 break-all text-zinc-200">
                    {label === "Sign-in method" && signInMethods.length ? (
                      <span className="flex flex-wrap items-center gap-2">
                        {signInMethods.map((provider) => {
                          const name = provider === "email" ? "Email" : provider === "google" ? "Google" : provider;
                          return provider === "email" || provider === "google" ? (
                            <span key={provider} role="img" aria-label={name} title={name} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-300">
                              {provider === "google" ? <GoogleIcon className="h-4 w-4" /> : <EmailIcon className="h-4 w-4" />}
                            </span>
                          ) : <span key={provider}>{name}</span>;
                        })}
                      </span>
                    ) : value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="max-w-60 text-xs leading-relaxed text-zinc-500">Signing out keeps data already synced to your Hana account.</p>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => {
                    router.push("/");
                    router.refresh();
                  });
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <SignOutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-zinc-950/55 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
                  <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
                  <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Connected lists</h2>
                <p className="mt-0.5 text-sm text-zinc-400">Two-way sync with AniList and MyAnimeList.</p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {PROVIDERS.map((config) => (
                <IntegrationRow
                  key={config.provider}
                  {...config}
                  state={config.provider === "anilist" ? anilist : mal}
                  now={now}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/55 p-5 sm:p-6 lg:col-span-2" aria-labelledby="reader-preferences-heading">
            <h2 id="reader-preferences-heading" className="text-lg font-bold text-white">Reader preferences</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose how you like to read. Changes save automatically.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 text-sm text-zinc-300">
                <p>Reading mode</p>
                <CustomSelect
                  label="Reading mode"
                  value={readerSettings.mode}
                  onChange={(value) => setReaderSettings({ mode: value as ReaderMode })}
                  options={[
                    { key: "webtoon", label: "Webtoon (scroll)" },
                    { key: "paged", label: "Single page" },
                    { key: "twopage", label: "Two-page spread" },
                  ]}
                  fullWidth
                />
              </div>
              <div className="space-y-2 text-sm text-zinc-300">
                <p>Reading direction</p>
                <CustomSelect
                  label="Reading direction"
                  value={readerSettings.direction}
                  onChange={(value) => setReaderSettings({ direction: value as ReaderDirection })}
                  options={[
                    { key: "ltr", label: "Left to right" },
                    { key: "rtl", label: "Right to left" },
                  ]}
                  fullWidth
                />
              </div>
              <label className="flex min-h-10 items-center justify-between gap-3 self-end text-sm text-zinc-300">
                Automatically open the next chapter
                <input
                  type="checkbox"
                  checked={readerSettings.autoAdvance}
                  onChange={(event) => setReaderSettings({ autoAdvance: event.target.checked })}
                  className="h-4 w-4 shrink-0 accent-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                />
              </label>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-zinc-500">Two-page spreads use single pages on phones. Zoom, brightness, page fit, and more are available in the reader settings.</p>
          </section>
        </div>

      </div>
    </main>
  );
}

function IntegrationRow({
  provider,
  name,
  description,
  href,
  tileClass,
  state,
  now,
}: {
  provider: ProviderId;
  name: string;
  description: string;
  href: string;
  tileClass: string;
  state: IntegrationState;
  now: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tileClass} text-white`}
        >
          <ProviderLogo provider={provider} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{name}</p>
          <p className="truncate text-sm text-zinc-400">{description}</p>
          {state.status === "not_configured" && (
            <p className="mt-0.5 text-xs text-amber-400">
              Currently unavailable.
            </p>
          )}
        </div>
      </div>

      {state.status === "checking" ? (
        <LoadingIcon className="h-10 w-10 shrink-0" />
      ) : state.status === "connected" ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
          {state.syncedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <SyncIcon className="h-3 w-3" />
              Synced {timeAgo(state.syncedAt, now)}
            </span>
          )}
        </div>
      ) : state.status === "not_configured" ? (
        <span className="text-xs text-zinc-500">Unavailable</span>
      ) : (
        <a
          href={href}
          className="shrink-0 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Connect
        </a>
      )}
    </div>
  );
}
