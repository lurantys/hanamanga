"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
import { SignInIcon } from "@/components/AuthIcons";
import { focusRing } from "@/lib/ui";

const authChip =
  "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900/80 text-zinc-200 transition-colors duration-200 hover:border-white/40 hover:bg-zinc-800/80 hover:text-white";

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
        aria-label={`Account${user.email ? ` — ${user.email}` : ""}`}
        className={`${authChip} overflow-hidden ${focusRing}`}
      >
        {avatar?.url ? (
          <Image
            src={avatar.url}
            alt=""
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold">
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
        className={`${authChip} sm:hidden ${focusRing}`}
      >
        <SignInIcon className="h-4 w-4" />
      </Link>
      <Link
        href="/login"
        className={`hidden items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-zinc-200 transition-colors duration-200 hover:border-white/40 hover:text-white sm:inline-flex ${focusRing}`}
      >
        <SignInIcon className="h-4 w-4" />
        Sign in
      </Link>
    </>
  );
}
