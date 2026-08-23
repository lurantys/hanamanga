"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorPage } from "@/components/ErrorPage";

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
    <ErrorPage
      eyebrow="Error"
      title={anilistDown ? "AniList is down" : "Something went wrong"}
      description={
        anilistDown
          ? "The AniList API has been temporarily disabled due to severe stability issues. Some catalog data is unavailable right now — please try again in a little while."
          : "The manga catalog couldn't be loaded right now. The source may be busy — give it a moment, or head home to keep browsing."
      }
    >
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
    </ErrorPage>
  );
}
