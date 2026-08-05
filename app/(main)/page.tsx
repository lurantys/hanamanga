import { Suspense } from "react";
import { HeroSpotlight } from "@/components/HeroSpotlight";
import { MangaRow } from "@/components/MangaRow";
import { getTrending } from "@/lib/read";
import {
  fetchByGenre,
  fetchPopular,
  fetchTopRated,
} from "@/lib/mangadex";

export const dynamic = "force-dynamic";

async function TrendingRow() {
  const { data } = await getTrending();
  return (
    <div id="trending" className="scroll-mt-16">
      <MangaRow title="Trending Now" manga={data} />
    </div>
  );
}

async function PopularRow() {
  const { data } = await fetchPopular(18);
  return <MangaRow title="All Time Popular" manga={data} />;
}

async function TopRatedRow() {
  const { data } = await fetchTopRated(18);
  return (
    <div id="top-rated" className="scroll-mt-16">
      <MangaRow title="Top Rated Manga" manga={data} />
    </div>
  );
}

async function ActionRow() {
  const { data } = await fetchByGenre("Action", 18);
  return <MangaRow title="High-Octane Action" manga={data} />;
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
      className="h-[80vh] min-h-[480px] w-full animate-pulse bg-gradient-to-t from-zinc-900 to-zinc-800"
    />
  );
}

export default function Home() {
  return (
    <main className="bg-zinc-950">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSpotlight />
      </Suspense>

      <div className="relative z-10 -mt-16 space-y-10 pb-20">
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
