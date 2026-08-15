import { MangaGridSkeleton } from "@/components/MangaCardSkeleton";

export default function BrowseLoading() {
  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        <div className="mb-6">
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-800/80" />
        </div>
        <div className="mb-4 h-9 w-full max-w-md animate-pulse rounded-full bg-zinc-800/70" />
        <MangaGridSkeleton count={24} />
      </div>
    </main>
  );
}