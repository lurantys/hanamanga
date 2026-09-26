function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />;
}

/** Reserves the same responsive footprint as the home hero while it loads. */
export function HeroLoading() {
  return (
    <div aria-hidden>
      <section className="relative min-h-[calc(93vw+27.5rem+env(safe-area-inset-top))] w-full overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)] md:hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950" />
        <Block className="absolute left-5 top-[calc(0.75rem+env(safe-area-inset-top))] h-9 w-28 rounded-lg" />
        <div className="relative z-10 mx-auto flex min-h-[68dvh] max-w-6xl flex-col items-center gap-8 px-5 pb-8 pt-[calc(5rem+env(safe-area-inset-top))]">
          <Block className="aspect-[2/3] w-[62vw] max-w-[300px] shrink-0 rounded-[14px]" />
          <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-4 pt-2">
            <div className="flex flex-wrap justify-center gap-2">
              <Block className="h-7 w-20 rounded-full" />
              <Block className="h-7 w-24 rounded-full" />
            </div>
            <Block className="h-16 w-4/5 max-w-2xl rounded-md" />
            <Block className="h-12 w-full max-w-2xl rounded-2xl" />
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Block className="h-11 w-32 rounded-xl" />
              <Block className="h-11 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden w-full overflow-hidden bg-zinc-950 md:block md:h-[70dvh] md:min-h-[420px]">
        <Block className="absolute inset-0 rounded-none bg-gradient-to-t from-zinc-950 via-zinc-800 to-zinc-900" />
        <div className="absolute inset-x-0 bottom-0 z-10 px-10 pb-20">
          <div className="flex items-end gap-8">
            <Block className="aspect-[2/3] w-44 shrink-0 rounded-lg xl:w-56" />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Block className="h-7 w-20 rounded-md" />
                <Block className="h-7 w-24 rounded-md" />
              </div>
              <Block className="h-16 w-3/4 max-w-3xl rounded-md" />
              <Block className="h-12 max-w-2xl rounded-xl" />
              <div className="flex gap-3">
                <Block className="h-11 w-32 rounded-xl" />
                <Block className="h-11 w-36 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
