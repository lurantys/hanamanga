"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

function UserIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}

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
    <>
      <Link
        href="/login"
        aria-label="Sign in"
        title="Sign in"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/60 text-zinc-200 transition-colors hover:border-white/25 hover:bg-zinc-800/80 hover:text-white sm:hidden"
      >
        <UserIcon className="h-4 w-4" />
      </Link>
      <Link
        href="/login"
        className="hidden items-center rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white sm:inline-flex"
      >
        Sign in
      </Link>
    </>
  );
}