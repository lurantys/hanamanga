"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { focusRing } from "@/lib/ui";
import { statusLabel, type Manga } from "@/lib/mangadex";
import { ratingTextClass, ratingTier } from "@/lib/rating";

type MangaCardProps = {
  manga: Pick<Manga, "id" | "title"> &
    Partial<Pick<Manga, "coverUrl" | "genres" | "rating" | "status" | "year">>;
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

  const label =
    ariaLabel ??
    (manga.rating
      ? `${manga.title} — rated ${rating.toFixed(1)}/10. Open detail page.`
      : `${manga.title}. Open detail page.`);

  return (
    <div className={`group relative w-36 shrink-0 md:w-44 ${className}`}>
      <Link
        href={href ?? `/manga/${manga.id}`}
        prefetch={false}
        aria-label={label}
        className={`block rounded-lg text-left ${focusRing}`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[1.03]">
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
      {actions}
    </div>
  );
}
