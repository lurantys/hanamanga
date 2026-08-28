"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALLED_KEY = "pwa-installed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function PWAInstallIcon() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return true;
    try {
      if (localStorage.getItem(INSTALLED_KEY)) return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) {
      setHidden(true);
      return;
    }
    try {
      if (localStorage.getItem(INSTALLED_KEY)) {
        setHidden(true);
        return;
      }
    } catch {}
    setIsIOSDevice(isIOS());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {}
      setHidden(true);
      setDeferred(null);
    };
    const onStandaloneChange = () => {
      if (isStandalone()) {
        setHidden(true);
        try {
          localStorage.setItem(INSTALLED_KEY, "1");
        } catch {}
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled);
    const mql = window.matchMedia("(display-mode: standalone)");
    const mqlListener = () => onStandaloneChange();
    if (mql.addEventListener) mql.addEventListener("change", mqlListener);
    else mql.addListener(mqlListener);

    const onStorage = (e: StorageEvent) => {
      if (e.key === INSTALLED_KEY) {
        try {
          if (localStorage.getItem(INSTALLED_KEY)) setHidden(true);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("storage", onStorage);
      if (mql.removeEventListener) mql.removeEventListener("change", mqlListener);
      else mql.removeListener(mqlListener);
    };
  }, []);

  const handleClick = () => {
    setShowSheet(true);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        try {
          localStorage.setItem(INSTALLED_KEY, "1");
        } catch {}
        setHidden(true);
        setShowSheet(false);
      }
    } catch {}
    finally {
      setDeferred(null);
    }
  };

  const showIOS = isIOS();

  if (hidden) return null;

  return (
    <>
      {/* Also hide via CSS before JS hydrates — no flash in standalone */}
      <style>{`@media (display-mode: standalone) { .pwa-install-icon { display: none !important; } }`}</style>
      {/* Top right of main page — scrolls with page, not fixed */}
      <div className="pwa-install-icon pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-10 lg:hidden [@media(display-mode:standalone)]:hidden">
        <button
          type="button"
          aria-label="Install Hana — Add to Home Screen"
          title="Install Hana"
          onClick={handleClick}
          className="pointer-events-auto h-[27px] w-[27px] transition active:scale-[0.96]"
        >
          <Image src="/download.png" alt="" width={27} height={27} className="h-[27px] w-[27px]" unoptimized />
        </button>
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 backdrop-blur-sm lg:hidden" onClick={() => setShowSheet(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add to Home Screen"
            className="glass-in w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-zinc-950/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
                <Image src="/icon-192.png" alt="Hana" width={36} height={36} className="h-full w-full object-cover" />
              </div>
              <h2 className="text-sm font-bold text-white">Add Hana to Home Screen</h2>
              <button type="button" onClick={() => setShowSheet(false)} aria-label="Close" className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Auto-install — only works on Android/Chrome where beforeinstallprompt exists; iOS has no programmatic install */}
            {deferred ? (
              <>
                <button type="button" onClick={handleInstall} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]">
                  <Image src="/lightmodeicon.png" alt="" width={18} height={18} className="h-4 w-4 rounded-full object-cover" unoptimized />
                  Install
                </button>
                <p className="mt-2 text-center text-[11px] text-zinc-500">One tap adds Hana to your home screen</p>
              </>
            ) : showIOS ? (
              <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-center text-xs font-medium text-amber-200">iPhone doesn&apos;t support auto-install — follow the steps below</p>
            ) : null}

            {/* iOS manual steps — same bottom stuff */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Or manually (<svg viewBox="0 0 24 24" fill="currentColor" className="inline h-[11px] w-[11px] -translate-y-px align-middle text-zinc-500" aria-hidden><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg> iPhone)</p>
              <ol className="space-y-2.5 text-[13px] text-zinc-300">
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-white">1</span>
                  <span>
                    Tap <span className="font-semibold text-white">Share</span>{" "}
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-zinc-800 align-middle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 text-white" aria-hidden>
                        <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
                        <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                      </svg>
                    </span>{" "}
                    in Safari.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-white">2</span>
                  <span>Tap <span className="font-semibold text-white">Add to Home Screen</span>.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-white">3</span>
                  <span>Tap <span className="font-semibold text-white">Add</span>.</span>
                </li>
              </ol>
            </div>

            <button type="button" onClick={() => setShowSheet(false)} className="mt-4 w-full rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
