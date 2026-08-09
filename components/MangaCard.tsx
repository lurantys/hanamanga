"use client";

import Image from "next/image";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { statusLabel, type Manga } from "@/lib/mangadex";

type MangaCardProps = {
  manga: Manga;
  className?: string;
};

export function MangaCard({ manga, className = "" }: MangaCardProps) {
  const genres = (manga.genres ?? []).slice(0, 2);
  const rating = manga.rating ?? 0;
  const match = Math.round(rating * 10);

  return (
    <Link
      href={`/manga/${manga.id}`}
      aria-label={
        manga.rating
          ? `${manga.title} — rated ${match}/100. Open detail page.`
          : `${manga.title}. Open detail page.`
      }
      className={`group w-36 shrink-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:w-44 ${className}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[1.03]">
        {manga.coverUrl ? (
          <Image
            src={manga.coverUrl}
            alt={manga.title}
            fill
            sizes="(max-width: 768px) 144px, 176px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-zinc-500">
            {manga.title}
          </span>
        )}

        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
        </span>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-zinc-950/90 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-coarse:opacity-100">
          {genres.map((genre) => (
            <span
              key={genre}
              className="rounded bg-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-sm font-semibold text-zinc-200">
          {manga.title}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {rating > 0 && (
            <>
              <StarRating />
              <span className="text-xs font-semibold text-zinc-300">
                {rating.toFixed(1)}
              </span>
            </>
          )}
          <span className="text-xs text-zinc-500">
            {statusLabel(manga.status)}
            {manga.year ? ` · ${manga.year}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
