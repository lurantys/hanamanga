"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore, useState } from "react";
import {
  CONTINUE_HERO_EVENT,
  CONTINUE_HERO_STORAGE_KEY,
  getContinueList,
  invalidateContinueHero,
  readContinueHero,
  saveContinueHero,
} from "@/lib/progress";
import { statusLabel, truncate, type Manga } from "@/lib/mangadex";

type HeroSpotlightClientProps = {
  initial: Manga;
};

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONTINUE_HERO_STORAGE_KEY) invalidateContinueHero();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONTINUE_HERO_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONTINUE_HERO_EVENT, onChange);
  };
}

export function HeroSpotlightClient({ initial }: HeroSpotlightClientProps) {
  const snapshot = useSyncExternalStore(subscribe, readContinueHero, () => null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const hero = snapshot?.manga ?? initial;
  const imageSrc: string | null = hero.coverUrl ?? null;

  const ready = !imageSrc || imageLoaded;

  useEffect(() => {
    const entry = getContinueList(1)[0];
    if (!entry) return;
    fetch(`/api/manga?ids=${encodeURIComponent(entry.mangaId)}&banners=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const manga = json?.data?.[0];
        if (!manga) return;
        saveContinueHero({
          manga,
          chapterId: entry.chapterId,
          chapterLabel: entry.chapterLabel,
          scrollFraction: entry.scrollFraction,
          mangaFraction: entry.mangaFraction,
          updatedAt: entry.updatedAt,
        });
      })
      .catch(() => {});
  }, []);

  const rating = hero.rating ?? 0;
  const match = rating.toFixed(1);
  const showRating =
    Boolean(hero.description) && rating > 0 && match !== "0.0";
  const description = truncate(hero.description, 400);
  const pct = snapshot
    ? Math.round((snapshot.mangaFraction ?? snapshot.scrollFraction) * 100)
    : null;
  const primaryHref = snapshot
    ? `/read/${hero.id}/${snapshot.chapterId}`
    : `/read/${hero.id}`;

  const actionButtons = (
    <>
      <Link
        href={primaryHref}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 transition active:scale-[0.97] hover:bg-white/80 md:flex-none md:px-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        {snapshot ? "Continue" : "Read Now"}
      </Link>
      <Link
        href={`/manga/${hero.id}`}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-500/50 px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.97] hover:bg-zinc-500/30 md:flex-none md:px-6"
      >
        More Info
      </Link>
    </>
  );

  return (
    <section
      key={`${hero.id}:${imageSrc ?? "none"}`}
      className="animate-hero-in relative w-full overflow-hidden bg-zinc-950 md:h-[80dvh] md:min-h-[480px]"
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          priority
          fill
          sizes="(min-width:768px) 100vw, 512px"
          onLoad={() => setImageLoaded(true)}
          className={`scale-125 object-cover blur-2xl object-top transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, #27272a 0%, #09090b 60%)",
          }}
        />
      )}

      {imageSrc && (
        <div aria-hidden className="absolute inset-0 bg-zinc-950/40" />
      )}

      {imageSrc && (
        <div
          aria-hidden
          className={`absolute inset-0 bg-zinc-900 transition-opacity duration-700 ${
            ready ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-zinc-950/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />

      <div className="relative z-10 px-5 pb-8 pt-32 md:absolute md:inset-x-0 md:bottom-0 md:px-10 md:pb-20 md:pt-0 lg:px-16">
        <div className="flex items-start gap-4 md:items-end md:gap-8">
          {hero.coverUrl && (
            <Link
              href={`/manga/${hero.id}`}
              aria-label={hero.title}
              className="shrink-0"
            >
              <Image
                src={hero.coverUrl}
                alt=""
                priority
                width={224}
                height={336}
                sizes="(min-width:1280px) 224px, (min-width:768px) 176px, 152px"
                className="aspect-[2/3] w-[9.5rem] rounded-xl object-cover shadow-2xl shadow-zinc-950/70 ring-1 ring-white/10 transition hover:ring-white/30 md:w-44 xl:w-56"
              />
            </Link>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2">
              {showRating ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-400">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6Z" />
                  </svg>
                  {match} / 10
                </span>
              ) : null}
              <span className="rounded-md border border-zinc-500/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                {statusLabel(hero.status)}
              </span>
              {hero.year && (
                <span className="text-sm text-zinc-300">{hero.year}</span>
              )}
              {hero.follows ? (
                <span className="text-sm text-zinc-400">
                  {hero.follows.toLocaleString()} followers
                </span>
              ) : null}
              {snapshot && pct !== null && (
                <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-300">
                  {snapshot.chapterLabel} · {pct}% of manga read
                </span>
              )}
            </div>

            <h1 className="line-clamp-3 max-w-3xl text-3xl font-extrabold tracking-tight text-white drop-shadow-lg md:line-clamp-2 md:text-6xl">
              {hero.title}
            </h1>

            {description && (
              <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-zinc-200 md:line-clamp-2 md:text-base">
                {description}
              </p>
            )}

            <div className="mt-2 hidden flex-wrap gap-3 md:flex">
              {actionButtons}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-3 md:hidden">{actionButtons}</div>
      </div>
    </section>
  );
}
