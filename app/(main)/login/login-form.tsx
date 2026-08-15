"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginForm() {
  const { signIn, signUp, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
        setError(
          "Check your email to confirm your account, then sign in.",
        );
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 pb-24 pt-32">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-black tracking-tight text-white">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-400">
          {mode === "signin"
            ? "Sign in to sync your library across devices."
            : "Save your library, progress, and settings to your account."}
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600"
          />
          <input
            type="password"
            required
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={busy || authLoading}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80 disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          {mode === "signin" ? (
            <>
              New to Hana?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-semibold text-zinc-200 transition-colors hover:text-white"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="font-semibold text-zinc-200 transition-colors hover:text-white"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-xs leading-relaxed text-zinc-600">
          Signing in is optional. Without an account, your library and progress
          stay on this device only.{" "}
          <Link
            href="/"
            className="text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline"
          >
            Back to browsing
          </Link>
        </p>
      </div>
    </main>
  );
}