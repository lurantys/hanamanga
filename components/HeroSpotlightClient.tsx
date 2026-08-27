"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONTINUE_HERO_EVENT,
  CONTINUE_HERO_STORAGE_KEY,
  getContinueList,
  readContinueHero,
  saveContinueHero,
  PROGRESS_EVENT,
} from "@/lib/progress";
import { getLibraryList, LIBRARY_EVENT } from "@/lib/library";
import { statusLabel, truncate, type Manga } from "@/lib/mangadex";
import { ratingBadgeClass, ratingTier } from "@/lib/rating";
import { HERO_FALLBACK_GRADIENT, ctaPrimary, ctaSecondary, focusRing } from "@/lib/ui";
import { StarIcon } from "./icons";

type HeroSpotlightClientProps = {
  initial: Manga;
};

type HeroState = {
  manga: Manga;
  isContinue: boolean;
  chapterId?: string;
  chapterLabel?: string;
  mangaFraction?: number;
  scrollFraction?: number;
};

export function HeroSpotlightClient({ initial }: HeroSpotlightClientProps) {
  const [hero, setHero] = useState<HeroState | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const displayHero = hero?.manga ?? initial;
  const isContinue = hero?.isContinue ?? false;
  const chapterId = hero?.chapterId;
  const chapterLabel = hero?.chapterLabel;
  const bannerSrc = displayHero.bannerUrl ?? null;
  const imageSrc: string | null = bannerSrc ?? displayHero.coverUrl ?? null;

  const ready = !imageSrc || imageLoaded;

  useEffect(() => {
    let active = true;

    function apply() {
      if (!active) return;
      const continueEntry = getContinueList(1)[0];
      if (continueEntry) {
        const snapshot = readContinueHero();
        const placeholder = snapshot
          ? (snapshot.manga as Manga)
          : {
              id: continueEntry.mangaId,
              title: continueEntry.mangaTitle,
              coverUrl: continueEntry.coverUrl,
              bannerUrl: null,
              genres: [],
              availableLanguages: [],
            };
        const nextHero: HeroState = {
          manga: placeholder,
          isContinue: true,
          chapterId: continueEntry.chapterId,
          chapterLabel: continueEntry.chapterLabel,
          mangaFraction: continueEntry.mangaFraction,
          scrollFraction: continueEntry.scrollFraction,
        };
        setHero((current) => {
          if (!current || current.manga.id !== nextHero.manga.id) return nextHero;
          const currentHasMetadata = Boolean(
            current.manga.bannerUrl || current.manga.description || current.manga.rating,
          );
          const nextHasMetadata = Boolean(
            nextHero.manga.bannerUrl || nextHero.manga.description || nextHero.manga.rating,
          );
          if (currentHasMetadata && !nextHasMetadata) return current;
          if (
            current.chapterId === nextHero.chapterId &&
            current.mangaFraction === nextHero.mangaFraction &&
            current.scrollFraction === nextHero.scrollFraction
          ) {
            return current;
          }
          return nextHero;
        });
        return;
      }

      const libraryEntry = getLibraryList(1)[0];
      if (libraryEntry) {
        setHero((current) =>
          current?.manga.id === libraryEntry.manga.id && !current.isContinue
            ? current
            : { manga: libraryEntry.manga, isContinue: false },
        );
        return;
      }

      setHero((current) => (current === null ? current : null));
    }

    apply();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTINUE_HERO_STORAGE_KEY) apply();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CONTINUE_HERO_EVENT, apply);
    window.addEventListener(PROGRESS_EVENT, apply);
    window.addEventListener(LIBRARY_EVENT, apply);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CONTINUE_HERO_EVENT, apply);
      window.removeEventListener(PROGRESS_EVENT, apply);
      window.removeEventListener(LIBRARY_EVENT, apply);
    };
  }, []);

  const heroId = hero?.manga.id ?? null;
  const heroIsContinue = hero?.isContinue ?? false;
  const heroKey = heroId
    ? `${heroIsContinue ? "continue" : "library"}:${heroId}`
    : null;
  useEffect(() => {
    if (!heroId || !heroKey) return;
    const controller = new AbortController();
    fetch(`/api/manga?ids=${encodeURIComponent(heroId)}&banners=1`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const manga = json?.data?.[0] as Manga | undefined;
        if (!manga || controller.signal.aborted) {
          return;
        }
        setHero((current) => {
          if (
            !current ||
            current.manga.id !== heroId ||
            current.isContinue !== heroIsContinue
          ) {
            return current;
          }
          return { ...current, manga };
        });

        if (heroIsContinue) {
          const entry = getContinueList(1)[0];
          if (entry?.mangaId === heroId) {
            saveContinueHero({
              manga,
              chapterId: entry.chapterId,
              chapterLabel: entry.chapterLabel,
              scrollFraction: entry.scrollFraction,
              mangaFraction: entry.mangaFraction,
              updatedAt: entry.updatedAt,
            });
          }
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [heroId, heroIsContinue, heroKey]);

  const rating = displayHero.rating ?? 0;
  const match = rating.toFixed(1);
  const ratingClass = ratingBadgeClass[ratingTier(rating)];
  const showRating =
    Boolean(displayHero.description) && rating > 0 && match !== "0.0";
  const descriptionMobile = truncate(displayHero.description, 320);
  const descriptionDesktop = truncate(displayHero.description, 400);
  const pct = isContinue
    ? Math.round((hero?.mangaFraction ?? hero?.scrollFraction ?? 0) * 100)
    : null;
  const primaryHref = isContinue && chapterId
    ? `/read/${displayHero.id}/${chapterId}`
    : `/read/${displayHero.id}`;

  return (
    <>
      {/* ===== MOBILE ONLY — premium streaming presentation ===== */}
      <section
        key={`${displayHero.id}:${imageSrc ?? "none"}:mobile`}
        className="animate-hero-in relative w-full overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)] md:hidden"
      >
        <div className="absolute inset-0">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              priority
              fill
              sizes="100vw"
              onLoad={() => setImageLoaded(true)}
              className={`object-cover object-top scale-105 transition-opacity duration-500 ${
                bannerSrc ? "" : "scale-110 blur-[30px]"
              } ${ready ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_GRADIENT }} />
          )}
          {displayHero.coverUrl && bannerSrc && (
            <div className="absolute inset-0 opacity-20">
              <Image
                src={displayHero.coverUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover scale-[1.4] blur-[50px]"
              />
            </div>
          )}
          <div aria-hidden className="absolute inset-0 bg-zinc-950/55" />
          {imageSrc && (
            <div
              aria-hidden
              className={`absolute inset-0 bg-zinc-800 transition-opacity duration-300 ${
                ready ? "opacity-0" : "opacity-100"
              }`}
            />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/10" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-transparent" />
        </div>

        {/* Top-left branding — offset for OS status bar */}
        <Link
          href="/"
          aria-label="Hana home"
          className="absolute left-5 z-20 flex items-center gap-1.5"
          style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <Image src="/logo-v2.png" alt="Hana" width={35} height={35} className="h-[35px] w-[35px] rounded-lg object-contain" />
          <span className="font-netflix text-[17px] font-black tracking-tight text-white" style={{ fontWeight: 900 }}>Hana</span>
        </Link>

        <div className="relative z-10 mx-auto flex min-h-[78dvh] max-w-6xl flex-col items-center gap-8 px-5 pb-8 pt-[calc(5rem+env(safe-area-inset-top))]">

          <Link
            href={`/manga/${displayHero.id}`}
            aria-label={displayHero.title}
            className={`group relative shrink-0 overflow-hidden rounded-[14px] bg-zinc-900 shadow-[0_24px_64px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition duration-300 hover:ring-white/20 md:rounded-[16px] ${focusRing}`}
          >
            {displayHero.coverUrl ? (
              <Image
                src={displayHero.coverUrl}
                alt=""
                priority
                width={360}
                height={540}
                sizes="62vw"
                className="aspect-[2/3] w-[62vw] max-w-[300px] object-cover"
              />
            ) : (
              <span className="flex aspect-[2/3] w-[62vw] max-w-[300px] items-center justify-center p-6 text-center text-sm text-zinc-500">
                {displayHero.title}
              </span>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/10 md:rounded-[16px]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.04]" />
          </Link>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-4 pt-2 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {showRating ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md ${ratingClass} border border-white/10`}>
                  <StarIcon className="h-3.5 w-3.5" />
                  {match} / 10
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-100 backdrop-blur-md">
                {statusLabel(displayHero.status)}
              </span>
            </div>

            <h1 className="mx-auto max-w-2xl text-[28px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
              {displayHero.title}
            </h1>

            {descriptionMobile && (
              <Link
                href={`/manga/${displayHero.id}`}
                className="mx-auto block max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 backdrop-blur-xl transition-colors hover:bg-white/[0.06] hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <p className="line-clamp-3 text-sm leading-relaxed text-zinc-200">
                  {descriptionMobile}
                </p>
              </Link>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link
                href={primaryHref}
                className={ctaPrimary}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                  <path d="M8 5.14v14l11-7z" />
                </svg>
                {isContinue ? "Continue" : "Read Now"}
                {isContinue && chapterLabel ? (
                  <span className="hidden text-xs font-medium text-zinc-500 sm:inline">
                    · {chapterLabel}
                    {pct !== null && pct > 0 ? ` · ${pct}%` : ""}
                  </span>
                ) : null}
              </Link>
              <Link
                href={`/manga/${displayHero.id}`}
                className={ctaSecondary}
              >
                More Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESKTOP ONLY — original conventional hero ===== */}
      <section
        key={`${displayHero.id}:${imageSrc ?? "none"}:desktop`}
        className="animate-hero-in relative hidden w-full overflow-hidden bg-zinc-950 md:block md:h-[80dvh] md:min-h-[480px]"
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            priority
            fill
            sizes="100vw"
            onLoad={() => setImageLoaded(true)}
            className={`object-cover object-[center_20%] object-top transition-opacity duration-300 ${
              bannerSrc ? "" : "scale-125 blur-2xl"
            } ${ready ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: HERO_FALLBACK_GRADIENT }}
          />
        )}

        {imageSrc && <div aria-hidden className="absolute inset-0 bg-zinc-950/40" />}

        {imageSrc && (
          <div
            aria-hidden
            className={`absolute inset-0 bg-zinc-800 transition-opacity duration-300 ${
              ready ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-zinc-950/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 px-10 pb-20">
          <div className="flex items-end gap-8">
            {displayHero.coverUrl && (
              <Link
                href={`/manga/${displayHero.id}`}
                aria-label={displayHero.title}
                className={`shrink-0 rounded-xl ${focusRing}`}
              >
                <Image
                  src={displayHero.coverUrl}
                  alt=""
                  priority
                  width={224}
                  height={336}
                  sizes="224px"
                  className="aspect-[2/3] w-44 rounded-lg object-cover shadow-2xl shadow-zinc-950/70 ring-1 ring-white/10 transition duration-200 hover:ring-white/30 xl:w-56"
                />
              </Link>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {showRating ? (
                  <span className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-bold ${ratingClass}`}>
                    <StarIcon className="h-4 w-4" />
                    {match} / 10
                  </span>
                ) : null}
                <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  {statusLabel(displayHero.status)}
                </span>
              </div>

              <h1 className="line-clamp-2 max-w-3xl text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
                {displayHero.title}
              </h1>

              {descriptionDesktop && (
                <p className="line-clamp-2 max-w-2xl text-base leading-relaxed text-zinc-200">
                  {descriptionDesktop}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href={primaryHref}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition duration-200 hover:bg-white/80 active:scale-[0.97] ${focusRing}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span className="flex flex-col items-start leading-tight">
                    {isContinue ? "Continue" : "Read Now"}
                    {isContinue && (
                      <span className="text-[11px] font-semibold text-zinc-500">
                        {chapterLabel}
                        {pct !== null && pct > 0 ? ` · ${pct}%` : ""}
                      </span>
                    )}
                  </span>
                </Link>
                <Link
                  href={`/manga/${displayHero.id}`}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-zinc-800/60 px-6 py-2.5 text-sm font-semibold text-zinc-100 backdrop-blur-sm transition duration-200 hover:border-white/30 hover:bg-zinc-700/60 hover:text-white ${focusRing}`}
                >
                  More Info
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
