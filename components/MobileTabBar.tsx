"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProviderAvatar } from "@/lib/use-provider-avatar";
import { focusRing } from "@/lib/ui";
import { BrowseIcon, LibraryIcon, SearchIcon } from "./icons";
import { SignInIcon } from "./AuthIcons";

const tabButton = `flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.97] ${focusRing}`;

const activeTab = "bg-red-500 text-white hover:bg-red-500 hover:text-white";

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const avatar = useProviderAvatar(user?.id ?? null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const isField = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);
    const onFocusIn = (event: FocusEvent) => {
      if (isField(event.target)) setKeyboardOpen(true);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (isField(event.target)) setKeyboardOpen(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const isHome = pathname === "/";
  const isBrowse = pathname.startsWith("/browse");
  const isSearch = pathname.startsWith("/search");
  const isLibrary = pathname.startsWith("/library");
  const isAccount =
    pathname.startsWith("/account") || pathname.startsWith("/login");

  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4 transition-all duration-300 lg:hidden ${
        keyboardOpen
          ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-950/70 px-1.5 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
        <Link
          href="/"
          aria-label="Hana home"
          aria-current={isHome ? "page" : undefined}
          title="Home"
          className={`${tabButton} ${isHome ? "bg-white/10 text-white" : ""}`}
        >
          <Image
            src="/logo-v2.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
        </Link>
        <Link
          href="/browse"
          aria-label="Browse"
          aria-current={isBrowse ? "page" : undefined}
          title="Browse"
          className={`${tabButton} ${isBrowse ? activeTab : ""}`}
        >
          <BrowseIcon className="h-5 w-5" />
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          aria-current={isSearch ? "page" : undefined}
          title="Search"
          className={`${tabButton} ${isSearch ? activeTab : ""}`}
        >
          <SearchIcon className="h-5 w-5" />
        </Link>
        <Link
          href="/library"
          aria-label="Library"
          aria-current={isLibrary ? "page" : undefined}
          title="Library"
          className={`${tabButton} ${isLibrary ? activeTab : ""}`}
        >
          <LibraryIcon className="h-5 w-5" />
        </Link>
        {loading ? (
          <span className="h-11 w-11 animate-pulse rounded-full bg-zinc-800/60" aria-hidden />
        ) : user ? (
          <Link
            href="/account"
            aria-label={`Account${user.email ? ` — ${user.email}` : ""}`}
            aria-current={isAccount ? "page" : undefined}
            title="Account"
            className={`${tabButton} overflow-hidden ${isAccount ? activeTab : ""}`}
          >
            {avatar?.url ? (
              <Image
                src={avatar.url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold">
                {user.email?.charAt(0).toUpperCase() ?? "U"}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            aria-label="Sign in"
            aria-current={isAccount ? "page" : undefined}
            title="Sign in"
            className={`${tabButton} ${isAccount ? activeTab : ""}`}
          >
            <SignInIcon className="h-5 w-5" />
          </Link>
        )}
      </div>
    </nav>
  );
}
