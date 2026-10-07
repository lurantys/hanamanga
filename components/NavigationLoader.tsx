"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RouteSkeleton } from "./RouteSkeleton";

const MAX_VISIBLE_MS = 10_000;

type SkeletonKind =
  | "home"
  | "browse"
  | "search"
  | "manga"
  | "library"
  | "account"
  | "characters"
  | "login"
  | "about"
  | "reader";

function skeletonForPath(pathname: string): SkeletonKind {
  if (pathname === "/") return "home";
  if (pathname === "/browse") return "browse";
  if (pathname === "/search") return "search";
  if (pathname === "/library") return "library";
  if (pathname === "/account") return "account";
  if (pathname === "/login") return "login";
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/read/")) return "reader";
  if (/^\/manga\/[^/]+\/characters\/?$/.test(pathname)) return "characters";
  if (pathname.startsWith("/manga/")) return "manga";
  return "home";
}

function currentRoute(): string {
  return window.location.pathname + window.location.search;
}

function NavigationLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    // Once Next commits the destination, its route-specific loading boundary
    // can take over if more content is still streaming.
    setDestination(null);
  }, [routeKey]);

  useEffect(() => {
    if (!destination) return;
    const timeout = window.setTimeout(() => setDestination(null), MAX_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [destination]);

  useEffect(() => {
    const beginNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || ("button" in event && event.button !== 0)) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.getAttribute("rel")?.includes("external")) return;

      try {
        const next = new URL(href, window.location.href);
        if (next.origin !== window.location.origin) return;
        const route = next.pathname + next.search;
        if (route === currentRoute()) return;
        setDestination(next.pathname);
      } catch {
        // Ignore invalid or non-navigation links.
      }
    };

    // Wait for a confirmed activation. A touch pointerdown may be the start
    // of a scroll; showing the full-screen loader then interrupts the gesture.
    document.addEventListener("click", beginNavigation, true);
    return () => {
      document.removeEventListener("click", beginNavigation, true);
    };
  }, []);

  if (!destination) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-y-auto bg-zinc-950">
      <RouteSkeleton kind={skeletonForPath(destination)} />
    </div>
  );
}

export function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderInner />
    </Suspense>
  );
}
