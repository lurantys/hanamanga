import { Suspense } from "react";
import { HeroSpotlight } from "@/components/HeroSpotlight";
import { ContinueRow } from "@/components/ContinueRow";
import { LibraryRow } from "@/components/LibraryRow";
import { MangaRow } from "@/components/MangaRow";
import { getTrending, getPopular, getTopRated, getByGenre } from "@/lib/read";
import type { Manga } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

function RowUnavailable({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 px-4 text-lg font-bold tracking-tight text-zinc-700 md:px-10">
        {title}
      </h2>
      <div className="px-4 py-4 md:px-10">
        <p className="text-sm text-zinc-500">
          Couldn&apos;t load this row right now. Please try again in a moment.
        </p>
      </div>
    </section>
  );
}

async function TrendingRow() {
  let manga: Manga[] = [];
  try {
    const result = await getTrending();
    manga = result.data;
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="Trending Now" />;
  }
  return (
    <div id="trending" className="scroll-mt-16">
      <MangaRow title="Trending Now" manga={manga} />
    </div>
  );
}

async function PopularRow() {
  let manga: Manga[] = [];
  try {
    const result = await getPopular(18);
    manga = result.data;
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="All Time Popular" />;
  }
  return <MangaRow title="All Time Popular" manga={manga} />;
}

async function TopRatedRow() {
  let manga: Manga[] = [];
  try {
    const result = await getTopRated(18);
    manga = result.data;
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="Top Rated Manga" />;
  }
  return (
    <div id="top-rated" className="scroll-mt-16">
      <MangaRow title="Top Rated Manga" manga={manga} />
    </div>
  );
}

async function ActionRow() {
  let manga: Manga[] = [];
  try {
    const result = await getByGenre("Action", 18);
    manga = result.data;
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="High-Octane Action" />;
  }
  return <MangaRow title="High-Octane Action" manga={manga} />;
}

function RowSkeleton({ title }: { title: string }) {
  return (
    <section aria-hidden>
      <h2 className="mb-3 px-4 text-lg font-bold tracking-tight text-zinc-700 md:px-10">
        {title}
      </h2>
      <div className="flex gap-3 overflow-hidden px-4 py-2 md:px-10">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-lg bg-zinc-800 md:w-44"
          />
        ))}
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section
      aria-hidden
      className="h-80 w-full animate-pulse bg-gradient-to-t from-zinc-900 to-zinc-800 md:h-[80dvh] md:min-h-[480px]"
    />
  );
}

export default function Home() {
  return (
    <main className="bg-zinc-950">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSpotlight />
      </Suspense>

      <div className="relative z-10 -mt-6 space-y-10 pb-20 md:-mt-16">
        <ContinueRow />
        <LibraryRow />

        <Suspense fallback={<RowSkeleton title="Trending Now" />}>
          <TrendingRow />
        </Suspense>

        <Suspense fallback={<RowSkeleton title="All Time Popular" />}>
          <PopularRow />
        </Suspense>

        <Suspense fallback={<RowSkeleton title="Top Rated Manga" />}>
          <TopRatedRow />
        </Suspense>

        <Suspense fallback={<RowSkeleton title="High-Octane Action" />}>
          <ActionRow />
        </Suspense>
      </div>
    </main>
  );
}
