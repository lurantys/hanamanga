"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { focusRing } from "@/lib/ui";
import { statusLabel, type Manga } from "@/lib/mangadex";
import { ratingTextClass, ratingTier } from "@/lib/rating";
import { isInLibrary, subscribeLibrary, toggleLibrary } from "@/lib/library";
import { getProgress, subscribeProgress } from "@/lib/progress";

type MangaCardProps = {
  manga: Pick<Manga, "id" | "title"> &
    Partial<Pick<Manga, "coverUrl" | "genres" | "rating" | "status" | "year" | "latestChapter">>;
  className?: string;
  /** Override the link target (defaults to the manga detail page). */
  href?: string;
  /** Override the accessible label. */
  ariaLabel?: string;
  /** Replaces the default rating/status meta row under the title. */
  subtitle?: ReactNode;
  /** Extra absolutely-positioned content inside the cover (badges, bars). */
  coverExtra?: ReactNode;
  /** Rendered after the link inside the group wrapper (action buttons). */
  actions?: ReactNode;
};

export function MangaCard({
  manga,
  className = "",
  href,
  ariaLabel,
  subtitle,
  coverExtra,
  actions,
}: MangaCardProps) {
  const genres = (manga.genres ?? []).slice(0, 2);
  const rating = manga.rating ?? 0;
  const ratingClass = ratingTextClass[ratingTier(rating)];
  const [loaded, setLoaded] = useState(false);
  const saved = useSyncExternalStore(
    subscribeLibrary,
    () => isInLibrary(manga.id),
    () => false,
  );
  const progress = useSyncExternalStore(
    subscribeProgress,
    () => getProgress(manga.id, undefined, manga.title),
    () => null,
  );
  const readHref = progress?.chapterId
    ? `/read/${progress.mangaId || manga.id}/${progress.chapterId}`
    : href ?? `/read/${manga.id}`;
  const progressPercent = progress
    ? Math.round((progress.mangaFraction ?? progress.scrollFraction) * 100)
    : null;

  const label =
    ariaLabel ??
    (manga.rating
      ? `${manga.title} — rated ${rating.toFixed(1)}/10. Open detail page.`
      : `${manga.title}. Open detail page.`);

  return (
    <div className={`group relative w-36 shrink-0 snap-start md:w-44 ${className}`}>
      <Link
        href={href ?? `/manga/${manga.id}`}
        prefetch={false}
        aria-label={label}
        className={`block rounded-lg text-left ${focusRing}`}
      >
        <div className="manga-card-surface relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 shadow-lg">
          {manga.coverUrl ? (
            <>
              {!loaded && (
                <div
                  className="absolute inset-0 animate-pulse bg-zinc-800"
                  aria-hidden
                />
              )}
              <Image
                src={manga.coverUrl}
                alt={manga.title}
                fill
                sizes="(max-width: 768px) 144px, 176px"
                onLoad={() => setLoaded(true)}
                className={`object-cover transition-opacity duration-300 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-zinc-500">
              {manga.title}
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap gap-1 bg-gradient-to-t from-zinc-950/90 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-coarse:opacity-100">
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-md bg-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200"
              >
                {genre}
              </span>
            ))}
          </div>

          {coverExtra}
        </div>

        <div className="mt-2 px-0.5">
          <p className="line-clamp-1 text-sm font-semibold text-zinc-200">
            {manga.title}
          </p>
          {subtitle !== undefined ? (
            subtitle
          ) : (
            <div className="mt-1 flex items-center gap-1.5">
              {rating > 0 && (
                <>
                  <StarRating className={ratingClass} />
                  <span
                    className={`text-xs font-semibold ${ratingClass}`}
                  >
                    {rating.toFixed(1)}
                  </span>
                </>
              )}
              <span className="text-xs text-zinc-500">
                {statusLabel(manga.status)}
                {manga.year ? ` · ${manga.year}` : ""}
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="manga-card-hover-panel pointer-events-none absolute inset-0 z-20 hidden translate-y-1 flex-col justify-end overflow-hidden rounded-lg bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 pt-16 opacity-0 md:flex">
        <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{manga.title}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {genres.map((genre) => (
            <span key={genre} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200">
              {genre}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] font-medium text-zinc-300">
          {progress?.chapterLabel
            ? progress.chapterLabel
            : manga.latestChapter
              ? `Chapter ${manga.latestChapter}`
              : "Chapters available"}
        </p>
        {progressPercent !== null && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15" aria-label={`${progressPercent}% read`}>
            <div className="h-full rounded-full bg-red-500" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
        <div className="pointer-events-auto mt-3 flex items-stretch gap-1.5">
          <Link href={readHref} className="flex h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-md bg-white px-2 text-[10px] font-bold leading-tight text-zinc-950 transition-colors hover:bg-zinc-200">
            {progress ? "Continue" : "Read"}
            {progress?.chapterLabel && (
              <span className="mt-0.5 text-[9px] font-semibold text-zinc-500">
                {progress.chapterLabel}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={saved ? `Remove ${manga.title} from library` : `Add ${manga.title} to library`}
            aria-pressed={saved}
            title={saved ? "Remove from Library" : "Add to Library"}
            onClick={() => toggleLibrary({ ...manga, genres: manga.genres ?? [], availableLanguages: [] } as Manga)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/20 bg-zinc-800/80 text-zinc-100 transition-colors hover:bg-zinc-700"
          >
            <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
              <path d="M4 4v16l8-4 8 4V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
            </svg>
          </button>
        </div>
      </div>
      {actions}
    </div>
  );
}
