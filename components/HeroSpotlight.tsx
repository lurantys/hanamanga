import Image from "next/image";
import Link from "next/link";
import { getTrending, pickHero } from "@/lib/read";
import { statusLabel, truncate } from "@/lib/mangadex";

export async function HeroSpotlight() {
  const { data } = await getTrending();
  const hero = pickHero(data);

  if (!hero) return null;

  const rating = hero.rating ?? 0;
  const match = Math.round(rating * 10);
  const description = truncate(hero.description, 240);

  return (
    <section className="relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-zinc-950">
      {hero.coverUrl ? (
        <Image
          src={hero.coverUrl}
          alt=""
          priority
          fill
          sizes="100vw"
          className="object-cover object-top"
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

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-zinc-950/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 px-5 pb-20 md:px-10 lg:px-16">
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
            href={`/read/${hero.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Read Now
          </Link>
          <Link
            href={`/manga/${hero.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-500/50 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-500/30"
          >
            More Info
          </Link>
        </div>
      </div>
    </section>
  );
}
