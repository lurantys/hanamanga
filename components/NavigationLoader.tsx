"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NezukoLoading } from "./NezukoLoading";

// Avoid flashing the overlay during fast App Router or browser-history restores.
// Show it only when navigation has taken long enough for the delay to elapse.
const SHOW_DELAY_MS = 160;
const MAX_VISIBLE_MS = 6000;

function sameRoute(a: string, b: string): boolean {
  return a === b;
}

function currentRoute(): string {
  return window.location.pathname + window.location.search;
}

function NavigationLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const scheduleTimerRef = useRef(0);
  const showTimerRef = useRef(0);
  const maxTimerRef = useRef(0);

  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const routeKeyRef = useRef(routeKey);

  const show = useCallback(() => {
    window.clearTimeout(showTimerRef.current);
    window.clearTimeout(maxTimerRef.current);
    showTimerRef.current = window.setTimeout(() => {
      setVisible(true);
      // Safety net: never trap the user behind the overlay.
      maxTimerRef.current = window.setTimeout(
        () => setVisible(false),
        MAX_VISIBLE_MS,
      );
    }, SHOW_DELAY_MS);
  }, []);

  // Defer setVisible out of history.pushState/replaceState: Next's router
  // calls those inside useInsertionEffect, where scheduling a state update
  // triggers "useInsertionEffect must not schedule updates".
  const scheduleShow = useCallback(() => {
    window.clearTimeout(scheduleTimerRef.current);
    scheduleTimerRef.current = window.setTimeout(show, 0);
  }, [show]);

  // The new route has settled; cancel a pending overlay or dismiss a visible one.
  useEffect(() => {
    routeKeyRef.current = routeKey;
    window.clearTimeout(scheduleTimerRef.current);
    window.clearTimeout(showTimerRef.current);
    window.clearTimeout(maxTimerRef.current);
    const timer = window.setTimeout(() => setVisible(false), 0);
    return () => window.clearTimeout(timer);
  }, [routeKey]);

  useEffect(() => {
    const origPushState = window.history.pushState.bind(window.history);
    const origReplaceState = window.history.replaceState.bind(window.history);

    // Catches router.push/replace (SearchBar, BrowseFilters, GenreMenu,
    // reader chapter arrows…) which never fire click events.
    const onHistoryUrl = (url: unknown) => {
      if (url == null) return;
      try {
        const next = new URL(String(url), window.location.href);
        if (next.origin !== window.location.origin) return;
        if (sameRoute(next.pathname + next.search, currentRoute())) return;
        scheduleShow();
      } catch {
        // Unparseable URL — ignore.
      }
    };

    window.history.pushState = function (
      ...args: Parameters<History["pushState"]>
    ) {
      onHistoryUrl(args[2]);
      return origPushState(...args);
    };
    window.history.replaceState = function (
      ...args: Parameters<History["replaceState"]>
    ) {
      onHistoryUrl(args[2]);
      return origReplaceState(...args);
    };

    // Back/forward buttons. Ignore history entries that only change the hash
    // or restore the same route; they don't need a page-loading overlay.
    const onPopState = () => {
      if (routeKeyRef.current === currentRoute()) return;
      scheduleShow();
    };

    // Instant feedback for link taps (covers the RSC-fetch window before
    // the URL swaps, and navigations where pushState fires late).
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("rel")?.includes("external")) return;
      try {
        const next = new URL(href, window.location.href);
        if (next.origin !== window.location.origin) return;
        if (sameRoute(next.pathname + next.search, currentRoute())) return;
        scheduleShow();
      } catch {
        // Unparseable href — ignore.
      }
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = origPushState;
      window.history.replaceState = origReplaceState;
      window.clearTimeout(scheduleTimerRef.current);
      window.clearTimeout(showTimerRef.current);
      window.clearTimeout(maxTimerRef.current);
    };
  }, [scheduleShow]);

  if (!visible) return null;
  return <NezukoLoading label="Loading…" />;
}

export function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderInner />
    </Suspense>
  );
}
