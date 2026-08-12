import { Suspense } from "react";
import { HeroSpotlight } from "@/components/HeroSpotlight";
import { ContinueRow } from "@/components/ContinueRow";
import { LibraryRow } from "@/components/LibraryRow";
import { RecommendedRow } from "@/components/RecommendedRow";
import { NewChaptersRow } from "@/components/NewChaptersRow";
import { MangaRow } from "@/components/MangaRow";
import {
  getTrending,
  getWebtoons,
  getManhua,
} from "@/lib/read";
import type { Manga } from "@/lib/mangadex";

export const revalidate = 300;

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

async function WebtoonsRow() {
  let manga: Manga[] = [];
  try {
    manga = await getWebtoons(18);
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="Webtoons & Manhwa" />;
  }
  return (
    <div id="webtoons" className="scroll-mt-16">
      <MangaRow title="Webtoons & Manhwa" manga={manga} />
    </div>
  );
}

async function ManhuaRow() {
  let manga: Manga[] = [];
  try {
    manga = await getManhua(18);
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="Manhua" />;
  }
  return <MangaRow title="Manhua" manga={manga} />;
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
      className="h-96 w-full animate-pulse bg-gradient-to-t from-zinc-900 to-zinc-800 md:h-[80dvh] md:min-h-[480px]"
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

        <RecommendedRow />
        <NewChaptersRow />

        <Suspense fallback={<RowSkeleton title="Webtoons & Manhwa" />}>
          <WebtoonsRow />
        </Suspense>

        <Suspense fallback={<RowSkeleton title="Manhua" />}>
          <ManhuaRow />
        </Suspense>
      </div>
    </main>
  );
}
