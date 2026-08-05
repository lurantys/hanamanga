"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          The manga catalog couldn&apos;t be loaded right now. MangaDex may be
          busy — give it a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
