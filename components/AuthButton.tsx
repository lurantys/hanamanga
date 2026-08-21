"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
import { SignInIcon } from "@/components/AuthIcons";

export function AuthButton() {
  const { user, loading } = useAuth();
  const avatar = useProviderAvatar(user?.id ?? null);

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
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900/80 text-sm font-bold text-zinc-200 transition-colors hover:border-red-500/40 hover:text-red-300"
      >
        {avatar?.url ? (
          <Image
            src={avatar.url}
            alt={user.email ?? "Account"}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {user.email?.charAt(0).toUpperCase() ?? "U"}
          </span>
        )}
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
        <SignInIcon className="h-4 w-4" />
      </Link>
      <Link
        href="/login"
        className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/40 hover:text-white sm:inline-flex"
      >
        <SignInIcon className="h-4 w-4" />
        Sign in
      </Link>
    </>
  );
}