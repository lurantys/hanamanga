"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { AniListIcon, MalIcon } from "@/components/BrandIcons";
import { useAuth, getDisplayName } from "@/lib/auth";
import { LoadingIcon } from "@/components/LoadingIcon";
import { syncNow } from "@/lib/sync";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
import { SignInIcon, SignOutIcon } from "@/components/AuthIcons";
import type { SyncSummary } from "@/lib/provider-sync";

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
  const { user, loading, signOut, updateDisplayName } = useAuth();
  const router = useRouter();
  const avatar = useProviderAvatar(user?.id ?? null);
  const searchParams = useSearchParams();
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

  const displayName = getDisplayName(user);

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

  const syncedTimes = [anilist.syncedAt, mal.syncedAt].filter(
    (value): value is string => Boolean(value),
  );
  const lastSynced = syncedTimes.length
    ? syncedTimes.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
    : null;

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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 pb-24 pt-header">
        <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
      </main>
    );
  }

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
    <main className="bg-zinc-950 pb-24">
      <div className="mx-auto max-w-2xl px-5 pt-28 md:px-10">
        <header>
          <div className="flex items-center gap-3">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 text-base font-bold text-zinc-200">
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
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
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
                  className="rounded-md p-1 text-zinc-600 transition-colors hover:text-zinc-300"
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
                  className="mt-0.5 flex items-center gap-2"
                >
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="w-48 rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1 text-[16px] text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 hover:border-white/25 focus:border-red-400/50 sm:text-sm"
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
                <p className="mt-0.5 text-sm text-zinc-400">
                  Account <span className="text-zinc-600">·</span>{" "}
                  {user.email}
                </p>
              )}
            </div>
          </div>
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
                ? "The service rejected the connection (bad client credentials or redirect URL mismatch). Check the app credentials on Vercel and the registered callback URL."
                : error === "sign_in_required"
                  ? "Please sign in first, then connect the service."
                  : `Something went wrong connecting that service (${error}). Please try again.`}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 animate-page-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/70 text-zinc-300">
                <SyncIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Sync</h2>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Library, progress, and read chapters across devices.
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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

          {lastSynced && (
            <p className="mt-3 text-xs text-zinc-500">
              Last synced {timeAgo(lastSynced, now)}
            </p>
          )}

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
                        <CheckIcon className="h-3 w-3 text-red-400" />
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

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 animate-page-in" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/70 text-zinc-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
                <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
                <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">External Lists</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Two-way sync with AniList and MyAnimeList.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {PROVIDERS.map((config) => (
              <IntegrationRow
                key={config.provider}
                {...config}
                state={config.provider === "anilist" ? anilist : mal}
              />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 animate-page-in" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Sign out</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Your library stays saved.</p>
            </div>
            <button
              onClick={() => {
                void signOut().then(() => {
                  router.push("/");
                  router.refresh();
                });
              }}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/70 hover:text-red-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <SignOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </section>
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
}: {
  provider: ProviderId;
  name: string;
  description: string;
  href: string;
  tileClass: string;
  state: IntegrationState;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3.5 transition-colors hover:border-white/20">
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tileClass} text-white shadow-lg shadow-black/30`}
        >
          <ProviderLogo provider={provider} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{name}</p>
          <p className="truncate text-sm text-zinc-400">{description}</p>
          {state.status === "not_configured" && (
            <p className="mt-0.5 text-xs text-amber-400">
              Not configured — set env vars to enable.
            </p>
          )}
        </div>
      </div>

      {state.status === "checking" ? (
        <LoadingIcon className="h-10 w-10 shrink-0" />
      ) : state.status === "connected" ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-900/60 px-2.5 py-1 text-xs font-semibold text-zinc-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
            </span>
            Connected
          </span>
          {state.syncedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <SyncIcon className="h-3 w-3" />
              Synced {timeAgo(state.syncedAt)}
            </span>
          )}
        </div>
      ) : (
        <a
          href={href}
          className="shrink-0 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-white/80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Connect
        </a>
      )}
    </div>
  );
}
