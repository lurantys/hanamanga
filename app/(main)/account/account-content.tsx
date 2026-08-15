"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { syncNow } from "@/lib/sync";

type IntegrationStatus = "idle" | "checking" | "connected" | "not_configured";

type IntegrationState = {
  status: IntegrationStatus;
  syncedAt: string | null;
};

function useIntegrationStatus(provider: string): IntegrationState {
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
  }, [provider]);

  return state;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AccountContent() {
  const { user, loading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const importOk = searchParams.get("import");
  const error = searchParams.get("error");
  const importCount = searchParams.get("count");

  const anilist = useIntegrationStatus("anilist");
  const mal = useIntegrationStatus("mal");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const importedCount = importCount ? Number.parseInt(importCount, 10) : null;

  useEffect(() => {
    if (!user) return;
    if (importOk === "anilist" || importOk === "mal") {
      void syncNow().catch(() => {});
    }
  }, [importOk, user]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      await syncNow();
      setSyncResult(
        "Library, progress, and connected services (AniList/MAL) synced.",
      );
    } catch {
      setSyncResult("Sync failed — try again.");
    } finally {
      setSyncing(false);
    }
  }, [setSyncing, setSyncResult]);

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
        <h1 className="text-2xl font-black tracking-tight text-white">
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
    <main className="bg-zinc-950 px-5 pb-24 pt-32 md:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Account
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Signed in as{" "}
          <span className="font-semibold text-zinc-200">{user.email}</span>
        </p>

        {importOk && error ? (
          <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "api_error_403" || error === "api_error_500"
              ? "The provider API is currently unavailable — try again later."
              : `Could not import your ${
                  importOk === "anilist" ? "AniList" : "MyAnimeList"
                } list. Please try again.`}
          </p>
        ) : importOk ? (
          <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
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
          <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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

        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Sync</h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                Syncs your library, progress, and read chapters across devices,
                and two-way syncs your AniList and MyAnimeList lists.
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
          {syncResult && (
            <p className="mt-3 text-sm text-zinc-300">{syncResult}</p>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-bold text-white">Tracked on other lists</h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            Connect a service to sync your tracked manga both ways — titles you
            add or read in Hana update your AniList/MAL list, and vice versa.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <IntegrationRow
              name="AniList"
              description="Two-way sync with your AniList manga list."
              state={anilist}
              href="/api/integrations/anilist"
              cta="Connect"
            />
            <IntegrationRow
              name="MyAnimeList"
              description="Two-way sync with your MAL manga list."
              state={mal}
              href="/api/integrations/mal"
              cta="Connect"
            />
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
              onClick={() => void signOut()}
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
  name,
  description,
  state,
  href,
  cta,
}: {
  name: string;
  description: string;
  state: IntegrationState;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3">
      <div>
        <p className="font-semibold text-white">{name}</p>
        <p className="text-sm text-zinc-400">{description}</p>
        {state.status === "not_configured" && (
          <p className="mt-0.5 text-xs text-amber-400">
            Not configured — set env vars to enable.
          </p>
        )}
      </div>
      {state.status === "checking" ? (
        <span className="h-8 w-16 animate-pulse rounded-full bg-zinc-800" />
      ) : state.status === "connected" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Connected
          {state.syncedAt ? ` · synced ${timeAgo(state.syncedAt)}` : ""}
        </span>
      ) : (
        <a
          href={href}
          className="shrink-0 inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
        >
          {cta}
        </a>
      )}
    </div>
  );
}
