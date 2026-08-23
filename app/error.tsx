"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const anilistDown = /temporarily disabled|severe stability issues/i.test(
    error?.message ?? "",
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-16">
      <div className="relative flex w-full max-w-4xl flex-col">
        <Link
          href="/"
          className="flex w-fit items-center gap-2"
          aria-label="Hana home"
        >
          <Image
            src="/logo-v2.png"
            alt="Hana"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
          />
          <span className="header-wordmark text-lg font-bold text-zinc-50">
            Hana
          </span>
        </Link>
        <div className="mt-14 flex flex-col items-center gap-12 md:flex-row md:items-center md:gap-20">
          <Image
            src="/nezukoloading.gif"
            alt="A clueless anime girl, lost and confused"
            width={250}
            height={270}
            unoptimized
            className="h-[20.8rem] w-auto shrink-0 rounded-2xl object-cover"
          />
          <div className="flex max-w-md flex-col text-center md:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
              Error
            </p>
            <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight text-white">
              {anilistDown ? "AniList is down" : "Something went wrong"}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              {anilistDown
                ? "The AniList API has been temporarily disabled due to severe stability issues. Some catalog data is unavailable right now — please try again in a little while."
                : "The manga catalog couldn't be loaded right now. The source may be busy — give it a moment, or head home to keep browsing."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
