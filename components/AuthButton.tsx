"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function AuthButton() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span className="hidden h-9 w-9 animate-pulse rounded-full bg-zinc-800 sm:block" />
    );
  }

  if (user) {
    return (
      <Link
        href="/account"
        title="Account"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-sm font-bold text-zinc-200 transition-colors hover:border-red-500/40 hover:text-red-300"
      >
        {user.email?.charAt(0).toUpperCase() ?? "U"}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="hidden items-center rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white sm:inline-flex"
    >
      Sign in
    </Link>
  );
}