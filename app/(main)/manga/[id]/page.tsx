import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtsuChapterList } from "@/components/AtsuChapterList";
import { MangaChapterList } from "@/components/MangaChapterList";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { LibraryButton } from "@/components/LibraryButton";
import { PlayButton } from "@/components/PlayButton";
import { StarRating } from "@/components/StarRating";
import {
  statusLabel,
  truncate,
  MangaDexError,
  type Chapter,
} from "@/lib/mangadex";
import {
  chaptersOfScanlator,
  primaryScanlator,
  type AtsuChapter,
  type AtsuMatch,
} from "@/lib/atsu";
import { fetchCatalogManga } from "@/lib/catalog";
import { getAtsuMatch, getKatanaLookup, getMdAggregate, getMdFeed, getWeebLookup } from "@/lib/read";
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
    manga = await fetchCatalogManga(id);
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
  }
  return {
    title: `${manga.title} — Hana`,
    description: manga.description ? truncate(manga.description, 160) : undefined,
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;
  const { ref } = parseMangaId(id);

  let manga;
  try {
    manga = await fetchCatalogManga(id);
  } catch (error) {
    if (error instanceof MangaDexError && error.status === 404) notFound();
    throw error;
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
        [feed, aggregate] = await Promise.all([
          getMdFeed(ref),
          getMdAggregate(ref),
        ]);
      } catch (error) {
        if (error instanceof MangaDexError && error.status === 404) notFound();
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
      <div className="relative h-[46dvh] min-h-[320px] w-full overflow-hidden">
        {manga.coverUrl ? (
          <Image
            src={manga.coverUrl}
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

      <div className="relative z-10 mx-auto -mt-52 max-w-5xl px-5 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end">
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
              <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-400">
                {manga.rating ? `${match} / 10` : "New"}
              </span>
              <span className="rounded-md border border-zinc-500/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                {statusLabel(manga.status)}
              </span>
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
                    className="rounded-full border border-white/10 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-200 transition-colors hover:border-emerald-400/40 hover:text-white"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {manga.rating ? (
              <div className="flex items-center gap-1.5">
                <StarRating sizeClass="h-4 w-4" />
                <span className="text-sm font-semibold text-zinc-300">
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
