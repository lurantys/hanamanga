"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoadingIcon } from "@/components/LoadingIcon";
import { syncNow } from "@/lib/sync";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
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
    description: "Two-way sync with your AniList manga list.",
    href: "/api/integrations/anilist",
    tileClass: "bg-zinc-800",
  },
  {
    provider: "mal",
    name: "MyAnimeList",
    description: "Two-way sync with your MAL manga list.",
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
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14.921 6.479c-.82 0-3.683 0-4.947 3.156-.662 1.652-.986 4.812.876 7.886l1.934-1.41s-.767-1.095-1.083-3.191h2.897l.022 3.19h2.604V8.835h-2.581v2.043l-2.46-.023s.413-2.408 2.877-2.336h2.454l-.572-2.04ZM0 6.528v9.624h2.348v-5.84l2.031 2.664 2.047-2.652v5.828h2.336V6.528H6.437L4.368 9.474 2.31 6.528Zm18.447.022v9.583h5.022L24 14.09h-3.232V6.55Z" />
    </svg>
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
  const { user, loading, signOut } = useAuth();
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
        setSyncResult(
          `Synced, but ${errors
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 pb-24 pt-32">
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
          className="mt-2 inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
        >
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
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 text-base font-bold text-zinc-200">
              {avatar?.url ? (
                <Image
                  src={avatar.url}
                  alt={user.email ?? "Account"}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  {user.email?.charAt(0).toUpperCase() ?? "U"}
                </span>
              )}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Account
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                Signed in as{" "}
                <span className="font-semibold text-zinc-200">{user.email}</span>
              </p>
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
          <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
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

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/70 text-zinc-300">
                <SyncIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Sync</h2>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Syncs your library, progress, and read chapters across
                  devices, and two-way syncs your AniList and MyAnimeList
                  lists.
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {provider.error ? (
                        <CheckIcon className="h-3 w-3 rotate-45 text-red-400" />
                      ) : (
                        <CheckIcon className="h-3 w-3" />
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

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/70 text-zinc-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
                <path d="M21 11v10H3V3h10" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Tracked on other lists
              </h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                Connect a service to sync your tracked manga both ways — titles
                you add or read in Hana update your AniList/MAL list, and vice
                versa.
              </p>
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

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Sign out</h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                Your data stays saved in your account.
              </p>
            </div>
            <button
              onClick={() => {
                void signOut().then(() => {
                  router.push("/");
                  router.refresh();
                });
              }}
              className="shrink-0 inline-flex items-center justify-center rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/70 hover:text-red-200"
            >
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
          {state.status === "checking" ? (
            <span className="h-5 w-5 animate-pulse rounded-full bg-white/25" />
          ) : (
            <ProviderLogo provider={provider} className="h-6 w-6" />
          )}
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
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-zinc-500">
          <LoadingIcon className="h-4 w-4" />
          Checking…
        </span>
      ) : state.status === "connected" ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
          className="shrink-0 inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
        >
          Connect
        </a>
      )}
    </div>
  );
}
