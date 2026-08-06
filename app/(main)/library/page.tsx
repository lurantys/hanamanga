"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getLibrarySnapshot,
  removeFromLibrary,
  subscribeLibrary,
} from "@/lib/library";
import { getAllProgress } from "@/lib/progress";

function getServerSnapshot(): ReturnType<typeof getLibrarySnapshot> {
  return {};
}

function thumbUrl(coverUrl?: string | null): string | null {
  return coverUrl?.replace(/\.512\.jpg$/, ".256.jpg") ?? coverUrl ?? null;
}

export default function LibraryPage() {
  const library = useSyncExternalStore(
    subscribeLibrary,
    getLibrarySnapshot,
    getServerSnapshot,
  );
  const entries = Object.values(library).sort((a, b) => b.addedAt - a.addedAt);
  const progress = getAllProgress();

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="mx-auto max-w-5xl px-5 pt-28 md:px-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Your Library
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {entries.length === 0
            ? "Manga you save will show up here."
            : `${entries.length} ${entries.length === 1 ? "title" : "titles"} saved.`}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-5 md:px-10">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-20 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-zinc-600"
              aria-hidden
            >
              <path d="M4 4v16l8-4 8 4V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
            </svg>
            <p className="text-sm text-zinc-400">
              Your library is empty. Open any manga and hit{" "}
              <span className="font-semibold text-zinc-200">
                Add to Library
              </span>{" "}
              to keep track of it here.
            </p>
            <Link
              href="/browse"
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
            >
              Browse manga
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map(({ manga, addedAt }) => {
              const mangaProgress = progress[manga.id];
              return (
                <div key={manga.id} className="group">
                  <Link
                    href={
                      mangaProgress
                        ? `/read/${manga.id}/${mangaProgress.chapterId}`
                        : `/manga/${manga.id}`
                    }
                    className="block focus:outline-none"
                    aria-label={
                      mangaProgress
                        ? `${manga.title} — continue from ${mangaProgress.chapterLabel}`
                        : manga.title
                    }
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03]">
                      {thumbUrl(manga.coverUrl) ? (
                        <Image
                          src={thumbUrl(manga.coverUrl)!}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-zinc-500">
                          {manga.title}
                        </span>
                      )}
                      {mangaProgress && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${Math.round(
                                (mangaProgress.mangaFraction ??
                                  mangaProgress.scrollFraction) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="mt-2 px-0.5">
                    <p className="line-clamp-1 text-sm font-semibold text-zinc-200">
                      {manga.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {mangaProgress
                        ? `Continue · ${mangaProgress.chapterLabel}`
                        : `Added ${new Date(addedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromLibrary(manga.id)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-red-400/40 hover:text-red-300"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <path d="M5 5l14 14M19 5L5 19" />
                    </svg>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
