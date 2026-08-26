import { MangaGridSkeleton } from "@/components/MangaCardSkeleton";

export default function SearchLoading() {
  return (
    <main className="bg-zinc-950 pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <header className="mb-6">
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-800/80" />
        </header>
        <MangaGridSkeleton count={24} />
      </div>
    </main>
  );
}
