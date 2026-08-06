export default function MangaLoading() {
  return (
    <main className="bg-zinc-950 pb-24">
      <div className="h-[46vh] min-h-[320px] w-full animate-pulse bg-zinc-900" />
      <div className="relative z-10 mx-auto -mt-52 max-w-5xl px-5 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end">
          <div className="aspect-[2/3] w-44 shrink-0 animate-pulse rounded-xl bg-zinc-800 md:w-56" />
          <div className="flex-1 space-y-4 pb-2">
            <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-800/70" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800/70" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-800" />
            </div>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
