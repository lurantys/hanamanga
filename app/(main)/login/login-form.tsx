"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

function EnvelopeIcon({ className }: { className?: string }) {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className ?? "h-4 w-4"}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginForm() {
  const { signIn, signUp, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      const { error } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);
      if (error) {
        setError(error);
        return;
      }
      if (mode === "signup") {
        setMode("signin");
        setSuccess(true);
        setError(null);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSuccess(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 pb-24 pt-32">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-v2.png"
            alt="Hana"
            width={64}
            height={64}
            priority
            className="h-16 w-16 rounded-2xl object-contain"
          />
          <span className="header-wordmark text-3xl font-bold text-zinc-50">
            Hana
          </span>
        </div>

        <div className="flex rounded-full bg-zinc-900 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-white text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <h1 className="mt-8 text-center text-2xl font-extrabold tracking-tight text-white">
          {mode === "signin" ? "Welcome back" : "Join Hana"}
        </h1>
        <p className="mt-1.5 text-center text-base text-zinc-400">
          {mode === "signin"
            ? "Sign in to sync your library across devices."
            : "Save your library, progress, and settings to your account."}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-300"
          >
            Check your email to confirm your account, then sign in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="relative block">
            <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-3 pl-11 pr-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600"
            />
          </label>
          <label className="relative block">
            <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-3 pl-11 pr-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600"
            />
          </label>
          <button
            type="submit"
            disabled={busy || authLoading}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-base font-semibold text-zinc-950 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Spinner />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-sm leading-relaxed text-zinc-600">
          Signing in is optional. Without an account, your library and progress
          stay on this device only.{" "}
          <Link
            href="/"
            className="font-semibold text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline"
          >
            Back to browsing
          </Link>
        </p>
      </div>
    </main>
  );
}
