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
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
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

  return (
    <main className="bg-zinc-950 pb-24">
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

      <div className="relative z-10 mx-auto -mt-40 max-w-5xl px-5 md:-mt-52 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="relative w-44 shrink-0 md:w-56">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-zinc-950/70">
              {manga.coverUrl ? (
                <Image
                  src={manga.coverUrl}
                  alt={manga.title}
                  fill
                  sizes="(max-width: 768px) 176px, 224px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-zinc-500">
                  {manga.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 pb-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span
                className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-bold ${ratingBadge}`}
              >
                {showRating ? `${match} / 10` : "New"}
              </span>
              <span className="rounded-md border border-zinc-500/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                {statusLabel(manga.status)}
              </span>
              {manga.type && (
                <span className="rounded-md border border-zinc-500/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  {manga.type}
                </span>
              )}
              {manga.source && manga.source !== "Manga" && (
                <span className="rounded-md border border-zinc-500/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  {manga.source === "Original"
                    ? "Original"
                    : `${manga.source} adaptation`}
                </span>
              )}
              {manga.year && (
                <span className="text-sm text-zinc-300">{manga.year}</span>
              )}
              {manga.follows ? (
                <span className="text-sm text-zinc-400">
                  {manga.follows.toLocaleString()} followers
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              {manga.title}
            </h1>

            {manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {manga.genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/browse?genre=${encodeURIComponent(genre)}`}
                    prefetch={false}
                    className="rounded-full border border-white/10 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-200 transition-colors hover:border-emerald-400/40 hover:text-white"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {primaryAuthor && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Mangaka
                </span>
                <span className="text-sm text-zinc-200">{primaryAuthor.name}</span>
                {primaryAuthor.role && !/story & art/i.test(primaryAuthor.role) ? (
                  <span className="text-zinc-500"> · {primaryAuthor.role}</span>
                ) : null}
              </div>
            )}

            {manga.links?.al && (
              <Link
                href={`/manga/${id}/characters`}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Characters
              </Link>
            )}

            {links.length > 0 && (
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
            )}

            {showRating ? (
              <div className="flex items-center gap-1.5">
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
            ) : null}

            {manga.description && (
              <ExpandableDescription
                text={manga.description}
                className="max-w-2xl text-sm leading-relaxed text-zinc-300"
              />
            )}

             <div className="flex flex-wrap gap-3 pt-1">
               <ContinueReadingButton mangaId={id}>
                 {readTarget ? (
                   readTargetExternalUrl ? (
                     <a
                       href={readTargetExternalUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
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
                       mangaId={id}
                       scanlators={atsuMatch.manga.scanlators}
                       chapters={atsuChapters}
                       defaultScanlatorId={primaryScanlatorId}
                     />
                   ) : (
                     <Link
                       href={`/read/${id}/${readTarget.id}`}
                       className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
                     >
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                         <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                       </svg>
                       Read Now
                     </Link>
                   )
                 ) : (
                   <PlayButton manga={manga} variant="read" />
                 )}
               </ContinueReadingButton>
               <LibraryButton manga={manga} />
             </div>
          </div>
        </div>

        <section className="mt-12" aria-label="Chapters">
          <h2 className="mb-1 text-xl font-bold tracking-tight text-white">
            {atsuMatch ? "Read on Hana" : "Chapters"}
          </h2>
          {atsuMatch ? (
            <p className="mb-5 text-sm text-zinc-500">
              {atsuReadingOrder.length.toLocaleString()} chapters in English
              {atsuMatch.matchedByLink ? " · matched to your title" : ""}
            </p>
          ) : weebChapters.length ? (
            <p className="mb-5 text-sm text-zinc-500">
              {weebChapters.length.toLocaleString()} chapters
            </p>
          ) : katanaChapters.length ? (
            <p className="mb-5 text-sm text-zinc-500">
              {katanaChapters.length.toLocaleString()} chapters
            </p>
          ) : feed?.total ? (
            <p className="mb-5 text-sm text-zinc-500">
              {feed.total.toLocaleString()} translated chapters across{" "}
              {aggregate?.volumes.length ?? 0}{" "}
              {(aggregate?.volumes.length ?? 0) === 1 ? "volume" : "volumes"}
            </p>
          ) : null}

          {atsuMatch ? (
            <AtsuChapterList
              mangaId={id}
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
              mangaId={id}
              volumes={volumes.map(([volume, chapters]) => ({ volume, chapters }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
