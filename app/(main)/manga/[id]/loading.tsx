export default function MangaLoading() {
  return (
    <main className="bg-zinc-950 pb-24">
      <div className="h-[34dvh] min-h-[260px] w-full animate-pulse bg-zinc-900 md:h-[46dvh] md:min-h-[320px]" />

      {/* Mobile skeleton — centered, matching polished layout */}
      <div className="relative z-10 mx-auto -mt-44 max-w-lg px-5 md:hidden">
        <div className="flex flex-col items-center">
          <div className="aspect-[2/3] w-[48vw] max-w-[220px] animate-pulse rounded-[14px] bg-zinc-800 shadow-[0_24px_64px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10" />
          <div className="mt-5 h-8 w-56 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 flex gap-2">
            <div className="h-7 w-16 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-zinc-800" />
          </div>
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>
        <div className="mx-auto mt-6 h-24 w-full max-w-lg animate-pulse rounded-2xl border border-white/[0.06] bg-zinc-800/50" />
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-6 w-16 animate-pulse rounded-full bg-zinc-800" />
          ))}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="relative z-10 mx-auto -mt-52 hidden max-w-5xl px-10 md:block">
        <div className="flex items-start gap-10">
          <div className="aspect-[2/3] w-56 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-800 shadow-2xl shadow-zinc-950/70 ring-1 ring-white/10" />
          <div className="flex-1 space-y-5 pb-2">
            <div className="h-12 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="flex gap-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-zinc-800" />
              <div className="h-7 w-24 animate-pulse rounded-md bg-zinc-800" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-800" />
            </div>
            <div className="border-t border-white/[0.06]" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-800/70" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800/70" />
          </div>
        </div>
      </div>

      {/* Chapter list skeleton */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-10">
        <div className="mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-xl border border-white/10 bg-zinc-900/60"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
