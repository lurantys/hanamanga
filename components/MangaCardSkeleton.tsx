export function MangaCardSkeleton() {
  return (
    <div className="w-36 shrink-0 animate-pulse md:w-44" aria-hidden>
      <div className="aspect-[2/3] rounded-lg bg-zinc-800" />
      <div className="mt-2 px-0.5 space-y-1.5">
        <div className="h-3.5 w-4/5 rounded bg-zinc-800" />
        <div className="h-3 w-3/5 rounded bg-zinc-800/80" />
      </div>
    </div>
  );
}

export function MangaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <MangaCardSkeleton key={index} />
      ))}
    </div>
  );
}