import { Suspense } from "react";
import { HeroSpotlight } from "@/components/HeroSpotlight";
import { HeroLoading } from "@/components/HeroLoading";
import { MangaRowLoading } from "@/components/MangaRowLoading";
import { ContinueRow } from "@/components/ContinueRow";
import { LibraryRow } from "@/components/LibraryRow";
import { RecommendedRow } from "@/components/RecommendedRow";
import { NewChaptersRow } from "@/components/NewChaptersRow";
import { MangaRow } from "@/components/MangaRow";
import { PWAInstallIcon } from "@/components/PWAInstallIcon";
import {
  getTrending,
  getWebtoons,
  getManhua,
  getManga,
} from "@/lib/read";
import type { Manga } from "@/lib/mangadex";

export const revalidate = 300;

function RowUnavailable({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 px-5 text-lg font-bold tracking-tight text-zinc-100 md:px-10">
        {title}
      </h2>
      <div className="px-5 py-4 md:px-10">
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

async function MangaRowSection() {
  let manga: Manga[] = [];
  try {
    manga = await getManga(18);
  } catch {
    // fall back to the unavailable state below
  }
  if (manga.length === 0) {
    return <RowUnavailable title="Manga" />;
  }
  return <MangaRow title="Manga" manga={manga} />;
}

export default function Home() {
  return (
    <main className="relative bg-zinc-950">
      <h1 className="sr-only">
        Hana — read manga, manhwa, manhua, and webtoons online
      </h1>
      <PWAInstallIcon />
      <Suspense fallback={<HeroLoading />}>
        <HeroSpotlight />
      </Suspense>

      <div className="relative z-10 -mt-6 space-y-10 pb-24 md:-mt-16">
        <ContinueRow />
        <LibraryRow />

        <Suspense fallback={<MangaRowLoading title="Trending Now" />}>
          <TrendingRow />
        </Suspense>

        <RecommendedRow />
        <NewChaptersRow />

        <Suspense fallback={<MangaRowLoading title="Manga" />}>
          <MangaRowSection />
        </Suspense>

        <Suspense fallback={<MangaRowLoading title="Webtoons & Manhwa" />}>
          <WebtoonsRow />
        </Suspense>

        <Suspense fallback={<MangaRowLoading title="Manhua" />}>
          <ManhuaRow />
        </Suspense>
      </div>
    </main>
  );
}
