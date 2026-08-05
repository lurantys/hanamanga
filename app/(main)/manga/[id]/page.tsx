import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtsuChapterList } from "@/components/AtsuChapterList";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { PlayButton } from "@/components/PlayButton";
import { StarRating } from "@/components/StarRating";
import {
  fetchAggregate,
  fetchFeed,
  fetchMangaById,
  mangaLink,
  statusLabel,
  truncate,
  type Chapter,
} from "@/lib/mangadex";
import {
  chaptersOfScanlator,
  fetchAtsuChapters,
  findAtsuManga,
  primaryScanlator,
  type AtsuChapter,
  type AtsuMatch,
} from "@/lib/atsu";

type MangaPageProps = {
  params: Promise<{ id: string }>;
};

function chapterLabel(chapter: Chapter): string {
  if (chapter.title && chapter.chapter) return `${chapter.chapter}: ${chapter.title}`;
  if (chapter.chapter) return `Chapter ${chapter.chapter}`;
  if (chapter.title) return chapter.title;
  return "Chapter";
}

export async function generateMetadata({
  params,
}: MangaPageProps): Promise<Metadata> {
  const { id } = await params;
  const manga = await fetchMangaById(id);
  return {
    title: `${manga.title} — Hana`,
    description: manga.description ? truncate(manga.description, 160) : undefined,
  };
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { id } = await params;

  let manga;
  let aggregate;
  let feed;
  try {
    [manga, aggregate, feed] = await Promise.all([
      fetchMangaById(id),
      fetchAggregate(id),
      fetchFeed(id),
    ]);
  } catch {
    notFound();
  }

  let atsuMatch: AtsuMatch | null = null;
  let atsuChapters: AtsuChapter[] = [];
  try {
    atsuMatch = await findAtsuManga({ title: manga.title, links: manga.links });
    if (atsuMatch) {
      atsuChapters = await fetchAtsuChapters(atsuMatch.manga.id);
    }
  } catch {
    atsuMatch = null;
  }

  const primaryScanlatorId = atsuMatch
    ? (primaryScanlator(atsuMatch.manga.scanlators, atsuChapters)?.id ?? null)
    : null;
  const atsuReadingOrder = atsuMatch
    ? chaptersOfScanlator(atsuChapters, primaryScanlatorId ?? "")
    : [];
  const firstChapter = atsuReadingOrder[0] ?? atsuChapters[0] ?? null;
  const fallbackFirstChapter = feed.data.find((chapter) => !chapter.externalUrl) ?? null;
  const readTarget = atsuMatch ? firstChapter : fallbackFirstChapter;

  const rating = manga.rating ?? 0;
  const match = Math.round(rating * 10);

  const volumesByKey = new Map<string | null, Chapter[]>();
  for (const chapter of feed.data) {
    const key = chapter.volume ?? null;
    if (!volumesByKey.has(key)) volumesByKey.set(key, []);
    volumesByKey.get(key)!.push(chapter);
  }
  const volumes = [...volumesByKey.entries()].sort(([a], [b]) =>
    a === null ? -1 : b === null ? 1 : Number(a) - Number(b),
  );

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
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
                {match}% Match
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
              <div className="flex items-center gap-2">
                <StarRating rating={rating / 2} sizeClass="h-4 w-4" />
                <span className="text-sm font-semibold text-zinc-300">
                  {rating.toFixed(2)}
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
                <Link
                  href={`/read/${id}/${readTarget.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Read Now
                </Link>
              ) : (
                <PlayButton manga={manga} variant="read" />
              )}
              <a
                href={mangaLink(manga.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-500/50 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-500/30"
              >
                View on MangaDex
              </a>
            </div>
          </div>
        </div>

        <section className="mt-12" aria-label="Chapters">
          <h2 className="mb-1 text-xl font-bold tracking-tight text-white">
            {atsuMatch ? "Read on Atsumaru" : "Chapters"}
          </h2>
          {atsuMatch ? (
            <p className="mb-5 text-sm text-zinc-500">
              {atsuReadingOrder.length.toLocaleString()} chapters in English
              {atsuMatch.matchedByLink ? " · matched to your title" : ""}
            </p>
          ) : feed.total ? (
            <p className="mb-5 text-sm text-zinc-500">
              {feed.total.toLocaleString()} translated chapters across{" "}
              {aggregate.volumes.length}{" "}
              {aggregate.volumes.length === 1 ? "volume" : "volumes"}
            </p>
          ) : null}

          {atsuMatch ? (
            <AtsuChapterList
              mangaId={id}
              scanlators={atsuMatch.manga.scanlators}
              chapters={atsuChapters}
              defaultScanlatorId={primaryScanlatorId}
            />
          ) : feed.data.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-center">
              <p className="text-sm text-zinc-400">
                No English chapters available yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {volumes.map(([volume, chapters]) => (
                <div key={volume ?? "no-volume"}>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-400">
                    {volume ? `Volume ${volume}` : "Unvolumed"}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 backdrop-blur-xl transition-colors hover:border-white/25"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-200">
                            {chapterLabel(chapter)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {chapter.pages} {chapter.pages === 1 ? "page" : "pages"}
                            {chapter.publishedAt
                              ? ` · ${new Date(chapter.publishedAt).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        {chapter.externalUrl ? (
                          <a
                            href={chapter.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700/60 hover:text-white"
                          >
                            External
                          </a>
                        ) : (
                          <Link
                            href={`/read/${id}/${chapter.id}`}
                            className="rounded-lg border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700/60 hover:text-white"
                          >
                            Read
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
