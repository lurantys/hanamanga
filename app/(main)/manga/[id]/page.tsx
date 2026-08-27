import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorPage } from "@/components/ErrorPage";
import { AtsuChapterList } from "@/components/AtsuChapterList";
import { ExternalLinkLogo } from "@/components/BrandIcons";
import { ContinueReadingButton } from "@/components/ContinueReadingButton";
import { MangaChapterList } from "@/components/MangaChapterList";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { LibraryButton } from "@/components/LibraryButton";
import { PlayButton } from "@/components/PlayButton";
import { ReadNowButton } from "@/components/ReadNowButton";
import { StarRating } from "@/components/StarRating";
import { ctaPrimary } from "@/lib/ui";
import { externalLinks } from "@/lib/external-links";
import {
  statusLabel,
  truncate,
  type Chapter,
} from "@/lib/mangadex";
import { ratingBadgeClass, ratingTextClass, ratingTier } from "@/lib/rating";
import {
  chaptersOfScanlator,
  primaryScanlator,
  type AtsuChapter,
  type AtsuMatch,
} from "@/lib/atsu";
import {
  fetchCatalogMangaWithFallback,
  isNotFoundError,
} from "@/lib/catalog";
import { getAtsuMatch, getKatanaLookup, getMdAggregate, getMdFeed, getWeebLookup, mdRefForManga } from "@/lib/read";
import {
  ANILIST_DOWN_MESSAGE,
  isAniListDownError,
} from "@/lib/anilist";
import { parseMangaId } from "@/lib/source";
import { toCatalogChapter } from "@/lib/mangakatana";
import { toWeebCatalogChapter } from "@/lib/weebcentral";

type MangaPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: MangaPageProps): Promise<Metadata> {
  const { id } = await params;
  let manga;
  try {
    manga = await fetchCatalogMangaWithFallback(id);
  } catch (error) {
    if (isAniListDownError(error)) {
      return {
        title: "AniList unavailable — Hana",
        description: ANILIST_DOWN_MESSAGE,
      };
    }
    if (isNotFoundError(error)) notFound();
    throw error;
  }
  const status = statusLabel(manga.status);
  const metaBits = [status, ...(manga.genres ?? []).slice(0, 3)].filter(Boolean);
  return {
    title: `${manga.title} — Hana`,
    description: manga.description
      ? truncate(manga.description, 160)
      : `Read ${manga.title} on Hana.${metaBits.length ? ` ${metaBits.join(", ")}.` : ""} Track your library and pick up right where you left off.`,
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;
  const { source, ref } = parseMangaId(id);

  let manga;
  try {
    manga = await fetchCatalogMangaWithFallback(id);
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    else if (isAniListDownError(error)) {
      return (
        <ErrorPage
          eyebrow="Error"
          title="AniList is down"
          description={`${ANILIST_DOWN_MESSAGE} Character and catalog data from AniList is unavailable right now. Please try again in a little while.`}
          className="pb-24 pt-32"
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Back to Home
          </Link>
        </ErrorPage>
      );
    } else {
      throw error;
    }
  }

  let atsuMatch: AtsuMatch | null = null;
  let atsuChapters: AtsuChapter[] = [];
  const atsuMatchData = await getAtsuMatch(id);
  if (atsuMatchData) {
    atsuMatch = atsuMatchData.match;
    atsuChapters = atsuMatchData.chapters;
  }

  let weebChapters: Chapter[] = [];
  let katanaChapters: Chapter[] = [];
  let feed: Awaited<ReturnType<typeof getMdFeed>> | null = null;
  let aggregate: Awaited<ReturnType<typeof getMdAggregate>> | null = null;
  if (!atsuMatch) {
    const [weebResult, katanaResult] = await Promise.all([
      getWeebLookup(manga).catch(() => null),
      getKatanaLookup(manga.title).catch(() => null),
    ]);
    weebChapters = weebResult?.chapters.map(toWeebCatalogChapter) ?? [];
    katanaChapters = katanaResult?.chapters.map(toCatalogChapter) ?? [];
    if (weebChapters.length === 0 && katanaChapters.length === 0) {
      try {
        const mdRef =
          source === "mangadex" ? ref : await mdRefForManga(manga);
        if (mdRef) {
          [feed, aggregate] = await Promise.all([
            getMdFeed(mdRef),
            getMdAggregate(mdRef),
          ]);
        } else {
          feed = null;
          aggregate = null;
        }
      } catch (error) {
        if (isNotFoundError(error)) notFound();
        feed = null;
        aggregate = null;
      }
    }
  }

  const primaryScanlatorId = atsuMatch
    ? (primaryScanlator(atsuMatch.manga.scanlators, atsuChapters)?.id ?? null)
    : null;
  const atsuReadingOrder = atsuMatch
    ? chaptersOfScanlator(atsuChapters, primaryScanlatorId ?? "")
    : [];
  const firstChapter = atsuReadingOrder[0] ?? atsuChapters[0] ?? null;
  const fallbackChapters = weebChapters.length
    ? weebChapters
    : katanaChapters.length
      ? katanaChapters
      : (feed?.data ?? []);
  const readableChapter = fallbackChapters.find(
    (chapter) => !chapter.externalUrl,
  );
  const externalChapter = fallbackChapters.find(
    (chapter) => chapter.externalUrl,
  );
  const fallbackFirstChapter = readableChapter ?? externalChapter ?? null;
  const readTarget = atsuMatch ? firstChapter : fallbackFirstChapter;
  const readTargetExternalUrl =
    !atsuMatch && fallbackFirstChapter?.externalUrl
      ? fallbackFirstChapter.externalUrl
      : null;

  const rating = manga.rating ?? 0;
  const match = rating.toFixed(1);
  const ratingBadge = rating > 0
    ? ratingBadgeClass[ratingTier(rating)]
    : "bg-zinc-500/15 text-zinc-300";
  const showRating =
    Boolean(manga.description) && rating > 0 && match !== "0.0";
  const links = externalLinks(manga.links);
  const headerImage = manga.bannerUrl ?? manga.coverUrl;
  const primaryAuthor = manga.authors?.length
    ? manga.authors.find((author) => /story|art/i.test(author.role ?? "")) ??
      manga.authors[0]
    : undefined;

  const volumesByKey = new Map<string | null, Chapter[]>();
  for (const chapter of fallbackChapters) {
    const key = chapter.volume ?? null;
    if (!volumesByKey.has(key)) volumesByKey.set(key, []);
    volumesByKey.get(key)!.push(chapter);
  }
  const volumes = [...volumesByKey.entries()].sort(([a], [b]) =>
    a === null ? -1 : b === null ? 1 : Number(a) - Number(b),
  );

  const alternateIds = [
    id,
    manga.id,
    manga.links?.al ? `al:${manga.links.al}` : null,
    manga.links?.al ?? null,
    atsuMatch ? `atsu:${atsuMatch.manga.id}` : null,
    atsuMatch ? atsuMatch.manga.id : null,
    source === "mangadex" ? ref : null,
  ].filter((v): v is string => Boolean(v));

  /* ---- Shared sub-components ---- */

  const readCta = readTarget ? (
    readTargetExternalUrl ? (
      <a
        href={readTargetExternalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={ctaPrimary}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
        Read on External
      </a>
    ) : atsuMatch ? (
      <ReadNowButton
        mangaId={manga.id}
        alternateIds={alternateIds}
        mangaTitle={manga.title}
        scanlators={atsuMatch.manga.scanlators}
        chapters={atsuChapters}
        defaultScanlatorId={primaryScanlatorId}
      />
    ) : (
      <Link
        href={`/read/${id}/${readTarget.id}`}
        className={ctaPrimary}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        Read Now
      </Link>
    )
  ) : (
    <PlayButton manga={manga} variant="read" />
  );

  const genreChips = manga.genres.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {manga.genres.map((genre) => (
        <Link
          key={genre}
          href={`/browse?genres=${encodeURIComponent(genre)}`}
          prefetch={false}
          className="rounded-full border border-white/10 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-200 transition-colors duration-200 hover:border-red-400/40 hover:bg-zinc-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {genre}
        </Link>
      ))}
    </div>
  );

  const statusBadges = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-bold ${ratingBadge}`}
      >
        {showRating ? `${match} / 10` : "New"}
      </span>
      <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
        {statusLabel(manga.status)}
      </span>
      {manga.type && (
        <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
          {manga.type}
        </span>
      )}
      {manga.source && manga.source !== "Manga" && (
        <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
          {manga.source === "Original"
            ? "Original"
            : `${manga.source} adaptation`}
        </span>
      )}
      {manga.year && (
        <span className="text-sm text-zinc-400">{manga.year}</span>
      )}
      {manga.follows ? (
        <span className="text-sm text-zinc-400">
          {manga.follows.toLocaleString()} followers
        </span>
      ) : null}
    </div>
  );

  const authorSection = primaryAuthor && (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        Mangaka
      </span>
      <Link
        href={`/search?author=${encodeURIComponent(primaryAuthor.name)}`}
        className="group inline-flex items-center gap-2 rounded-full text-sm text-zinc-200 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label={`View manga by ${primaryAuthor.name}`}
      >
        {primaryAuthor.imageUrl ? (
          <Image
            src={primaryAuthor.imageUrl}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10 transition group-hover:ring-white/30"
          />
        ) : null}
        <span className="underline decoration-white/20 underline-offset-4 group-hover:decoration-white/60">
          {primaryAuthor.name}
        </span>
      </Link>
      {primaryAuthor.role && !/story & art/i.test(primaryAuthor.role) ? (
        <span className="text-zinc-500"> · {primaryAuthor.role}</span>
      ) : null}
    </div>
  );

  const charactersLink = manga.links?.al && (
    <Link
      href={`/manga/${id}/characters`}
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors duration-200 hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      Characters
    </Link>
  );

  const externalLinksSection = links.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        Also on
      </span>
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-0.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-zinc-700/60 hover:text-white"
        >
          <ExternalLinkLogo logoKey={link.key} />
          {link.label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-zinc-500" aria-hidden>
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </a>
      ))}
    </div>
  );

  const ratingDisplay = showRating && (
    <div className="flex items-center justify-center gap-1.5 md:justify-start">
      <StarRating
        sizeClass="h-4 w-4"
        className={ratingTextClass[ratingTier(rating)]}
      />
      <span
        className={`text-sm font-semibold ${ratingTextClass[ratingTier(rating)]}`}
      >
        {rating.toFixed(1)}
      </span>
      <span className="text-sm text-zinc-500">/ 10</span>
    </div>
  );

  return (
    <main className="bg-zinc-950 pb-24">
      {/* ===== Banner ===== */}
      <div className="relative h-[34dvh] min-h-[260px] w-full overflow-hidden md:h-[46dvh] md:min-h-[320px]">
        {headerImage ? (
          <Image
            src={headerImage}
            alt=""
            priority
            fill
            sizes="100vw"
            className="object-cover object-top opacity-40"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="relative z-10 mx-auto -mt-44 max-w-lg px-5 md:hidden">
        <div className="flex flex-col items-center text-center">
          {/* Cover art — viewport-relative sizing like hero, centered with cinematic shadow */}
          <div className="relative shrink-0 overflow-hidden rounded-[14px] bg-zinc-900 shadow-[0_24px_64px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            {manga.coverUrl ? (
              <Image
                src={manga.coverUrl}
                alt={manga.title}
                width={360}
                height={540}
                sizes="48vw"
                className="aspect-[2/3] w-[48vw] max-w-[220px] object-cover"
              />
            ) : (
              <span className="flex aspect-[2/3] w-[48vw] max-w-[220px] items-center justify-center p-4 text-center text-sm text-zinc-500">
                {manga.title}
              </span>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/10" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.04]" />
          </div>

          {/* Title */}
          <h1 className="mx-auto mt-5 max-w-sm text-[26px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
            {manga.title}
          </h1>

          {/* Compact inline metadata — pills with backdrop-blur like hero */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs font-bold backdrop-blur-md ${ratingBadge}`}
            >
              {showRating ? (
                <>
                  <StarRating
                    sizeClass="h-3 w-3"
                    className={ratingTextClass[ratingTier(rating)]}
                  />
                  {match}
                </>
              ) : "New"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-100 backdrop-blur-md">
              {statusLabel(manga.status)}
            </span>
            {manga.type && (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-100 backdrop-blur-md">
                {manga.type}
              </span>
            )}
          </div>

          {/* CTAs — directly in centered flow */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ContinueReadingButton
              mangaId={manga.id}
              alternateIds={alternateIds}
              mangaTitle={manga.title}
            >
              {readCta}
            </ContinueReadingButton>
            <LibraryButton manga={manga} />
          </div>
        </div>

        {/* Description card — glass treatment matching hero */}
        {manga.description && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 backdrop-blur-xl">
            <ExpandableDescription
              text={manga.description}
              className="text-left text-sm leading-relaxed text-zinc-300"
            />
          </div>
        )}

        {/* Genre chips — centered */}
        {manga.genres.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {manga.genres.map((genre) => (
              <Link
                key={genre}
                href={`/browse?genres=${encodeURIComponent(genre)}`}
                prefetch={false}
                className="rounded-full border border-white/10 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-200 transition-colors duration-200 hover:border-red-400/40 hover:bg-zinc-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {genre}
              </Link>
            ))}
          </div>
        )}

        {/* Details card — grouped metadata, centered items */}
        {(primaryAuthor || showRating || links.length > 0 || manga.links?.al) && (
          <div className="mx-auto mt-6 max-w-lg space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
            {primaryAuthor && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Mangaka
                </span>
                <Link
                  href={`/search?author=${encodeURIComponent(primaryAuthor.name)}`}
                  className="group inline-flex items-center gap-2 rounded-full text-sm text-zinc-200 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label={`View manga by ${primaryAuthor.name}`}
                >
                  {primaryAuthor.imageUrl ? (
                    <Image
                      src={primaryAuthor.imageUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10 transition group-hover:ring-white/30"
                    />
                  ) : null}
                  <span className="underline decoration-white/20 underline-offset-4 group-hover:decoration-white/60">
                    {primaryAuthor.name}
                  </span>
                </Link>
                {primaryAuthor.role && !/story & art/i.test(primaryAuthor.role) ? (
                  <span className="text-xs text-zinc-500">{primaryAuthor.role}</span>
                ) : null}
              </div>
            )}
            {showRating && ratingDisplay}
            {manga.links?.al && (
              <div className="flex justify-center">
                {charactersLink}
              </div>
            )}
            {links.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Also on
                </span>
                {links.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-0.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-zinc-700/60 hover:text-white"
                  >
                    <ExternalLinkLogo logoKey={link.key} />
                    {link.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-zinc-500" aria-hidden>
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
            {/* Inline metadata row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-zinc-400">
              {manga.year && <span>{manga.year}</span>}
              {manga.source && manga.source !== "Manga" && (
                <span>
                  {manga.source === "Original" ? "Original" : `${manga.source} adaptation`}
                </span>
              )}
              {manga.follows ? (
                <span>{manga.follows.toLocaleString()} followers</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="relative z-10 mx-auto -mt-52 hidden max-w-5xl px-10 md:block">
        <div className="flex items-start gap-10">
          {/* Cover art */}
          <div className="relative w-56 shrink-0">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-zinc-950/70 ring-1 ring-white/10">
              {manga.coverUrl ? (
                <Image
                  src={manga.coverUrl}
                  alt={manga.title}
                  fill
                  sizes="224px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-zinc-500">
                  {manga.title}
                </span>
              )}
            </div>
          </div>

          {/* Info column */}
          <div className="flex-1 space-y-5 pb-2">
            {/* Title first — most important element */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
              {manga.title}
            </h1>

            {/* Status badges inline */}
            {statusBadges}

            {/* CTAs — immediately accessible */}
            <div className="flex flex-wrap gap-3">
              <ContinueReadingButton
                mangaId={manga.id}
                alternateIds={alternateIds}
                mangaTitle={manga.title}
              >
                {readCta}
              </ContinueReadingButton>
              <LibraryButton manga={manga} />
            </div>

            {/* Thin separator */}
            <div className="border-t border-white/[0.06]" />

            {/* Description */}
            {manga.description && (
              <ExpandableDescription
                text={manga.description}
                className="max-w-2xl text-sm leading-relaxed text-zinc-300"
              />
            )}

            {/* Genre chips */}
            {genreChips}

            {/* Grouped metadata */}
            <div className="space-y-3">
              {authorSection}
              {showRating && ratingDisplay}
              {charactersLink}
              {externalLinksSection}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Chapters section ===== */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-10">
        <section className="mt-12" aria-label="Chapters">
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {atsuMatch ? "Read on Hana" : "Chapters"}
            </h2>
            {atsuMatch ? (
              <span className="text-sm text-zinc-500">
                {atsuReadingOrder.length.toLocaleString()} chapters in English
                {atsuMatch.matchedByLink ? " · matched to your title" : ""}
              </span>
            ) : weebChapters.length ? (
              <span className="text-sm text-zinc-500">
                {weebChapters.length.toLocaleString()} chapters
              </span>
            ) : katanaChapters.length ? (
              <span className="text-sm text-zinc-500">
                {katanaChapters.length.toLocaleString()} chapters
              </span>
            ) : feed?.total ? (
              <span className="text-sm text-zinc-500">
                {feed.total.toLocaleString()} translated chapters across{" "}
                {aggregate?.volumes.length ?? 0}{" "}
                {(aggregate?.volumes.length ?? 0) === 1 ? "volume" : "volumes"}
              </span>
            ) : null}
          </div>

          {atsuMatch ? (
            <AtsuChapterList
              mangaId={manga.id}
              scanlators={atsuMatch.manga.scanlators}
              chapters={atsuChapters}
              defaultScanlatorId={primaryScanlatorId}
            />
          ) : fallbackChapters.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-center">
              <p className="text-sm text-zinc-400">
                No English chapters available yet.
              </p>
            </div>
          ) : (
            <MangaChapterList
              mangaId={manga.id}
              volumes={volumes.map(([volume, chapters]) => ({ volume, chapters }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
