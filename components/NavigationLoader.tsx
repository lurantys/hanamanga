"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NezukoLoading } from "./NezukoLoading";

// Route loading.tsx only renders when a navigation actually suspends.
// Cached (ISR) pages resolve instantly, so the overlay would never show.
// This loader triggers on every SPA navigation instead, with a minimum
// visible time so it always "kicks off" — even for cached titles.
const MIN_VISIBLE_MS = 650;
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
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef(0);
  const maxTimerRef = useRef(0);

  const show = useCallback(() => {
    shownAtRef.current = Date.now();
    window.clearTimeout(hideTimerRef.current);
    window.clearTimeout(maxTimerRef.current);
    setVisible(true);
    // Safety net: never trap the user behind the overlay.
    maxTimerRef.current = window.setTimeout(
      () => setVisible(false),
      MAX_VISIBLE_MS,
    );
  }, []);

  const hide = useCallback(() => {
    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      window.clearTimeout(maxTimerRef.current);
      setVisible(false);
    }, remaining);
  }, []);

  // The new route has settled — dismiss (honoring the minimum time).
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  useEffect(() => {
    hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        show();
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

    // Back/forward buttons.
    const onPopState = () => show();

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
        show();
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
      window.clearTimeout(hideTimerRef.current);
      window.clearTimeout(maxTimerRef.current);
    };
  }, [show]);

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
