"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { syncNow } from "@/lib/sync";

type IntegrationStatus = "idle" | "checking" | "connected" | "not_configured";

function useIntegrationStatus(provider: string): IntegrationStatus {
  const [status, setStatus] = useState<IntegrationStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/integrations/${provider}/status`)
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json().catch(() => null)) as {
          connected?: boolean;
          configured?: boolean;
        } | null;
        if (json?.connected) setStatus("connected");
        else if (json?.configured === false) setStatus("not_configured");
        else setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  return status;
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
      setSyncResult("Library and progress synced.");
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
                } list was empty or no titles matched MangaDex.`}
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
                Your library, progress, read chapters, and settings are stored
                in your account and shared across devices.
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
          <h2 className="text-lg font-bold text-white">Import from other lists</h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            Connect a service to bring your tracked manga into Hana. Imports
            add titles to your library.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <IntegrationRow
              name="AniList"
              description="Import your AniList manga list."
              status={anilist}
              href="/api/integrations/anilist"
              cta="Connect"
            />
            <IntegrationRow
              name="MyAnimeList"
              description="Import your MAL manga list."
              status={mal}
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
  status,
  href,
  cta,
}: {
  name: string;
  description: string;
  status: IntegrationStatus;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3">
      <div>
        <p className="font-semibold text-white">{name}</p>
        <p className="text-sm text-zinc-400">{description}</p>
        {status === "not_configured" && (
          <p className="mt-0.5 text-xs text-amber-400">
            Not configured — set env vars to enable.
          </p>
        )}
      </div>
      {status === "checking" ? (
        <span className="h-8 w-16 animate-pulse rounded-full bg-zinc-800" />
      ) : status === "connected" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Connected
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
