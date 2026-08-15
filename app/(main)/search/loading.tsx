import { MangaGridSkeleton } from "@/components/MangaCardSkeleton";

export default function SearchLoading() {
  return (
    <main className="bg-zinc-950 pb-24">
      <div className="px-5 pt-28 md:px-10">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <MangaGridSkeleton count={24} />
      </div>
    </main>
  );
}