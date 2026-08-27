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

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const avatar = useProviderAvatar(user?.id ?? null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

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

  // Fix: logging out/in navigates and focus may stay stuck (login input keeps focusin true).
  // Blur any focused input on route or auth change so focusout fires and tab bar reappears.
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      const el = document.activeElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      ) {
        el.blur();
      }
    }
  }, [pathname, user?.id, loading]);

  const isHome = pathname === "/";
  const isBrowse = pathname.startsWith("/browse");
  const isSearch = pathname.startsWith("/search");
  const isLibrary = pathname.startsWith("/library");
  const isAccount =
    pathname.startsWith("/account") || pathname.startsWith("/login");

  const activeIndex = isHome ? 0 : isBrowse ? 1 : isSearch ? 2 : isLibrary ? 3 : 4;

  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4 transition-all duration-150 lg:hidden ${
        keyboardOpen
          ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Liquid Glass pill — 25% smaller than 50% enlarged (net ~12% bigger than original) */}
      <div
        className="relative flex items-center gap-[5px] rounded-[32px] border border-white/[0.08] bg-zinc-900/85 p-[7px] shadow-[0_12px_48px_rgba(0,0,0,0.55),0_1px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.03)] backdrop-blur-[22px] backdrop-saturate-[140%] supports-[backdrop-filter]:bg-zinc-900/85"
        style={{
          boxShadow:
            "0 12px 48px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-[30px] border border-white/[0.06]"
        />

        {/* Fluid morphing selection indicator — 25% smaller */}
        <div
          aria-hidden
          className="absolute left-[7px] top-[7px] h-[50px] w-[50px] rounded-full border border-white/[0.18] bg-white/[0.20] shadow-[inset_0_1px_1px_rgba(255,255,255,0.30),inset_0_-1px_1px_rgba(255,255,255,0.08),0_3px_14px_rgba(0,0,0,0.22),0_1px_3px_rgba(0,0,0,0.18)] backdrop-blur-xl will-change-transform"
          style={{
            transform: `translateX(${activeIndex * 55}px)`,
            transition:
              "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), width 160ms cubic-bezier(0.32, 0.72, 0, 1), opacity 100ms ease",
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.26] via-white/[0.08] to-transparent opacity-90" />
          <div className="pointer-events-none absolute inset-x-2 bottom-[2px] h-[1px] rounded-full bg-white/25 blur-[0.5px]" />
        </div>

        {/* Home */}
        <Link
          href="/"
          aria-label="Hana home"
          aria-current={isHome ? "page" : undefined}
          title="Home"
          onTouchStart={() => setPressedIndex(0)}
          onTouchEnd={() => setPressedIndex(null)}
          onMouseDown={() => setPressedIndex(0)}
          onMouseUp={() => setPressedIndex(null)}
          onMouseLeave={() => setPressedIndex(null)}
          className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full focus-visible:outline-none ${focusRing} ${
            isHome ? "text-white" : "text-white/60 hover:text-white/85"
          }`}
          style={{
            transform: pressedIndex === 0 ? "scale(0.86)" : "scale(1)",
            transition:
              pressedIndex === 0
                ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), color 100ms ease",
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              transform: isHome ? "scale(1.06)" : "scale(1)",
              transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <Image
              src="/logo-v2.png"
              alt=""
              width={40}
              height={40}
              className={`h-8 w-8 rounded-lg object-contain transition-[filter,opacity] duration-150 ${isHome ? "opacity-100" : "opacity-80"}`}
            />
          </span>
        </Link>

        {/* Browse */}
        <Link
          href="/browse"
          aria-label="Browse"
          aria-current={isBrowse ? "page" : undefined}
          title="Browse"
          onTouchStart={() => setPressedIndex(1)}
          onTouchEnd={() => setPressedIndex(null)}
          onMouseDown={() => setPressedIndex(1)}
          onMouseUp={() => setPressedIndex(null)}
          onMouseLeave={() => setPressedIndex(null)}
          className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full focus-visible:outline-none ${focusRing} ${
            isBrowse ? "text-white" : "text-white/60 hover:text-white/85"
          }`}
          style={{
            transform: pressedIndex === 1 ? "scale(0.86)" : "scale(1)",
            transition:
              pressedIndex === 1
                ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), color 100ms ease",
          }}
        >
          <span
            style={{
              transform: isBrowse ? "scale(1.08)" : "scale(1)",
              transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className="flex"
          >
            <BrowseIcon className="h-[22px] w-[22px]" />
          </span>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          aria-label="Search"
          aria-current={isSearch ? "page" : undefined}
          title="Search"
          onTouchStart={() => setPressedIndex(2)}
          onTouchEnd={() => setPressedIndex(null)}
          onMouseDown={() => setPressedIndex(2)}
          onMouseUp={() => setPressedIndex(null)}
          onMouseLeave={() => setPressedIndex(null)}
          className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full focus-visible:outline-none ${focusRing} ${
            isSearch ? "text-white" : "text-white/60 hover:text-white/85"
          }`}
          style={{
            transform: pressedIndex === 2 ? "scale(0.86)" : "scale(1)",
            transition:
              pressedIndex === 2
                ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), color 100ms ease",
          }}
        >
          <span
            style={{
              transform: isSearch ? "scale(1.08)" : "scale(1)",
              transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className="flex"
          >
            <SearchIcon className="h-[22px] w-[22px]" />
          </span>
        </Link>

        {/* Library */}
        <Link
          href="/library"
          aria-label="Library"
          aria-current={isLibrary ? "page" : undefined}
          title="Library"
          onTouchStart={() => setPressedIndex(3)}
          onTouchEnd={() => setPressedIndex(null)}
          onMouseDown={() => setPressedIndex(3)}
          onMouseUp={() => setPressedIndex(null)}
          onMouseLeave={() => setPressedIndex(null)}
          className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full focus-visible:outline-none ${focusRing} ${
            isLibrary ? "text-white" : "text-white/60 hover:text-white/85"
          }`}
          style={{
            transform: pressedIndex === 3 ? "scale(0.86)" : "scale(1)",
            transition:
              pressedIndex === 3
                ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), color 100ms ease",
          }}
        >
          <span
            style={{
              transform: isLibrary ? "scale(1.08)" : "scale(1)",
              transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className="flex"
          >
            <LibraryIcon className="h-[22px] w-[22px]" />
          </span>
        </Link>

        {/* Account / Login */}
        {loading ? (
          <span
            className="relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full"
            aria-hidden
          >
            <span className="h-8 w-8 animate-pulse rounded-full bg-white/10 backdrop-blur" />
          </span>
        ) : user ? (
          <Link
            href="/account"
            aria-label={`Account${user.email ? ` — ${user.email}` : ""}`}
            aria-current={isAccount ? "page" : undefined}
            title="Account"
            onTouchStart={() => setPressedIndex(4)}
            onTouchEnd={() => setPressedIndex(null)}
            onMouseDown={() => setPressedIndex(4)}
            onMouseUp={() => setPressedIndex(null)}
            onMouseLeave={() => setPressedIndex(null)}
            className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full focus-visible:outline-none ${focusRing} ${
              isAccount ? "text-white" : "text-white/90"
            }`}
            style={{
              transform: pressedIndex === 4 ? "scale(0.86)" : "scale(1)",
              transition:
                pressedIndex === 4
                  ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                  : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {avatar?.url ? (
              <span
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
                style={{
                  transform: isAccount ? "scale(1.08)" : "scale(1)",
                  transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <Image
                  src={avatar.url}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold leading-none backdrop-blur ${
                  isAccount ? "bg-white text-zinc-900" : "bg-white/12 text-white"
                }`}
                style={{
                  transform: isAccount ? "scale(1.08)" : "scale(1)",
                  transition:
                    "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 100ms ease",
                }}
              >
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
            onTouchStart={() => setPressedIndex(4)}
            onTouchEnd={() => setPressedIndex(null)}
            onMouseDown={() => setPressedIndex(4)}
            onMouseUp={() => setPressedIndex(null)}
            onMouseLeave={() => setPressedIndex(null)}
            className={`relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full focus-visible:outline-none ${focusRing} ${
              isAccount ? "text-white" : "text-white/60 hover:text-white/85"
            }`}
            style={{
              transform: pressedIndex === 4 ? "scale(0.86)" : "scale(1)",
              transition:
                pressedIndex === 4
                  ? "transform 60ms cubic-bezier(0.32, 0.72, 0, 1)"
                  : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), color 100ms ease",
            }}
          >
            <span
              style={{
                transform: isAccount ? "scale(1.08)" : "scale(1)",
                transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              className="flex"
            >
              <SignInIcon className="h-[22px] w-[22px]" />
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
