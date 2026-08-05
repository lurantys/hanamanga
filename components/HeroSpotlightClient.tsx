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
  bannerUrl: string | null;
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

export function HeroSpotlightClient({ initial, bannerUrl }: HeroSpotlightClientProps) {
  const snapshot = useSyncExternalStore(subscribe, readContinueHero, () => null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const hero: Manga = snapshot?.manga ?? initial;
  const banner: string | null = snapshot
    ? (snapshot.manga.bannerUrl ?? null)
    : bannerUrl;
  const imageSrc: string | null = banner ?? hero.coverUrl ?? null;

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
  const match = Math.round(rating * 10);
  const description = truncate(hero.description, 240);
  const pct = snapshot
    ? Math.round((snapshot.mangaFraction ?? snapshot.scrollFraction) * 100)
    : null;
  const primaryHref = snapshot
    ? `/read/${hero.id}/${snapshot.chapterId}`
    : `/read/${hero.id}`;

  return (
    <section
      key={`${hero.id}:${imageSrc ?? "none"}`}
      className="animate-hero-in relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-zinc-950"
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          priority
          fill
          sizes="100vw"
          onLoad={() => setImageLoaded(true)}
          className={`object-cover transition-opacity duration-700 ${
            ready ? "animate-kenburns opacity-100" : "opacity-0"
          } ${!banner ? "object-top" : ""}`}
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
        <div
          aria-hidden
          className={`absolute inset-0 bg-zinc-900 transition-opacity duration-700 ${
            ready ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-zinc-950/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />

      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-4 px-5 pb-20 transition-opacity duration-500 md:px-10 lg:px-16 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6Z" />
            </svg>
            {match}% Match
          </span>
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

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-6xl">
          {hero.title}
        </h1>

        {description && (
          <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-zinc-200 md:text-base">
            {description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition active:scale-[0.97] hover:bg-white/80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {snapshot ? "Continue" : "Read Now"}
          </Link>
          <Link
            href={`/manga/${hero.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-500/50 px-6 py-2.5 text-sm font-bold text-white transition active:scale-[0.97] hover:bg-zinc-500/30"
          >
            More Info
          </Link>
        </div>
      </div>
    </section>
  );
}
