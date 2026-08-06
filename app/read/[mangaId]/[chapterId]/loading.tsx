export default function ReadLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-3 sm:px-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2 px-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-zinc-800/70" />
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-6 flex max-w-4xl items-center justify-center gap-2 px-4">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800" />
        <div className="hidden h-4 w-40 animate-pulse rounded bg-zinc-800/60 sm:block" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-800" />
      </div>
      <div className="mx-auto mt-8 max-w-4xl space-y-4 px-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[75vh] animate-pulse rounded-lg bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
