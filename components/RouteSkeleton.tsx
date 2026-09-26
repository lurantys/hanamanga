type SkeletonKind =
  | "page"
  | "home"
  | "browse"
  | "search"
  | "manga"
  | "library"
  | "account"
  | "characters"
  | "login"
  | "about"
  | "reader";

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />;
}

function CardGrid({ count = 12, portrait = false }: { count?: number; portrait?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${portrait ? "lg:grid-cols-6" : "lg:grid-cols-6"}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl">
          <Block className={`${portrait ? "aspect-[3/4]" : "aspect-[2/3]"} rounded-xl`} />
          <Block className="mt-2 h-3 w-4/5 rounded-md" />
          {!portrait && <Block className="mt-1.5 h-2.5 w-2/5 rounded-md bg-zinc-900" />}
        </div>
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <main aria-label="Loading home page" className="min-h-screen bg-zinc-950 pb-24">
      <Block className="h-[58dvh] min-h-[390px] rounded-none bg-gradient-to-t from-zinc-900 to-zinc-800 md:h-[70dvh]" />
      <div className="relative z-10 -mt-6 space-y-9 md:-mt-16">
        {["Continue Reading", "Trending Now", "Recommended for You", "New Chapters"].map((title) => (
          <section key={title} aria-hidden>
            <Block className="mb-3 ml-5 h-5 w-40 rounded-md md:ml-10" />
            <div className="flex gap-3 overflow-hidden px-5 md:px-10">
              {Array.from({ length: 7 }, (_, index) => (
                <Block key={index} className="aspect-[2/3] w-36 shrink-0 rounded-lg md:w-44" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function BrowseSkeleton() {
  return (
    <main aria-label="Loading browse page" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-7xl">
        <Block className="h-8 w-36" />
        <Block className="mt-2 h-4 w-72 max-w-full rounded-md bg-zinc-900" />
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, index) => <Block key={index} className="h-10 w-28 rounded-full" />)}
        </div>
        <div className="mt-8"><CardGrid /></div>
      </div>
    </main>
  );
}

function SearchSkeleton() {
  return (
    <main aria-label="Loading search results" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-7xl">
        <Block className="h-8 w-56" />
        <Block className="mt-5 h-12 w-full max-w-2xl rounded-2xl" />
        <div className="mt-8"><CardGrid count={12} /></div>
      </div>
    </main>
  );
}

function MangaSkeleton() {
  return (
    <main aria-label="Loading manga page" className="min-h-screen bg-zinc-950 pb-24">
      <Block className="h-[34dvh] min-h-[260px] rounded-none bg-gradient-to-t from-zinc-950 to-zinc-800 md:h-[46dvh] md:min-h-[320px]" />
      <div className="relative mx-auto -mt-36 max-w-7xl px-5 md:-mt-44 md:px-10">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-end md:gap-8">
          <Block className="aspect-[2/3] w-40 shrink-0 rounded-2xl md:w-56" />
          <div className="w-full space-y-4 pb-2 text-center md:text-left">
            <Block className="mx-auto h-8 w-2/3 md:mx-0 md:w-96" />
            <div className="flex justify-center gap-2 md:justify-start">
              <Block className="h-7 w-20 rounded-full" /><Block className="h-7 w-24 rounded-full" />
            </div>
            <div className="flex justify-center gap-3 pt-2 md:justify-start">
              <Block className="h-11 w-32 rounded-xl" /><Block className="h-11 w-36 rounded-xl" />
            </div>
          </div>
        </div>
        <Block className="mx-auto mt-8 h-24 max-w-3xl rounded-2xl md:mx-0" />
        <Block className="mt-10 h-6 w-40 rounded-md" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => <Block key={index} className="h-14 rounded-xl" />)}
        </div>
      </div>
    </main>
  );
}

function LibrarySkeleton() {
  return (
    <main aria-label="Loading library" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><Block className="h-8 w-40" /><Block className="mt-2 h-4 w-56 rounded-md bg-zinc-900" /></div>
          <Block className="h-10 w-32 rounded-full" />
        </div>
        <div className="mt-7 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {Array.from({ length: 4 }, (_, index) => <Block key={index} className="h-9 w-24 rounded-full" />)}
        </div>
        <div className="mt-5 flex gap-3"><Block className="h-11 flex-1 rounded-xl" /><Block className="h-11 w-36 rounded-xl" /><Block className="h-11 w-24 rounded-xl" /></div>
        <div className="mt-7"><CardGrid count={12} /></div>
      </div>
    </main>
  );
}

function AccountSkeleton() {
  return (
    <main aria-label="Loading account" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-4xl">
        <Block className="h-8 w-40" />
        <Block className="mt-2 h-4 w-72 max-w-full rounded-md bg-zinc-900" />
        <Block className="mt-8 h-40 rounded-2xl" />
        <Block className="mt-5 h-52 rounded-2xl" />
        <Block className="mt-5 h-56 rounded-2xl" />
      </div>
    </main>
  );
}

function CharactersSkeleton() {
  return (
    <main aria-label="Loading characters" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-5xl">
        <Block className="h-8 w-56" />
        <Block className="mt-2 h-4 w-64 rounded-md bg-zinc-900" />
        <div className="mt-8"><CardGrid count={12} portrait /></div>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <main aria-label="Loading sign in" className="grid min-h-screen place-items-center bg-zinc-950 px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-7">
        <Block className="mx-auto h-9 w-40" />
        <Block className="mx-auto mt-3 h-4 w-64 max-w-full rounded-md bg-zinc-900" />
        <Block className="mt-8 h-11 rounded-xl" />
        <Block className="mt-3 h-11 rounded-xl" />
        <Block className="mt-3 h-11 rounded-xl" />
        <Block className="mx-auto mt-6 h-3 w-44 rounded-md bg-zinc-900" />
      </div>
    </main>
  );
}

function AboutSkeleton() {
  return (
    <main aria-label="Loading about page" className="min-h-screen bg-zinc-950 px-5 pb-24 pt-header md:px-10">
      <div className="mx-auto max-w-4xl">
        <Block className="h-10 w-72 max-w-full" />
        <Block className="mt-4 h-5 w-full max-w-2xl rounded-md bg-zinc-900" />
        <Block className="mt-2 h-5 w-5/6 max-w-2xl rounded-md bg-zinc-900" />
        <Block className="mt-10 h-52 rounded-2xl" />
        <Block className="mt-8 h-7 w-52 rounded-md" />
        <Block className="mt-3 h-20 rounded-2xl" />
      </div>
    </main>
  );
}

export function RouteSkeleton({ kind = "page" }: { kind?: SkeletonKind }) {
  if (kind === "home") return <HomeSkeleton />;
  if (kind === "browse") return <BrowseSkeleton />;
  if (kind === "search") return <SearchSkeleton />;
  if (kind === "manga") return <MangaSkeleton />;
  if (kind === "library") return <LibrarySkeleton />;
  if (kind === "account") return <AccountSkeleton />;
  if (kind === "characters") return <CharactersSkeleton />;
  if (kind === "login") return <LoginSkeleton />;
  if (kind === "about") return <AboutSkeleton />;
  if (kind === "reader") {
    return (
      <main aria-label="Loading chapter" className="min-h-[70vh] bg-zinc-950 px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <Block className="mx-auto mb-4 h-10 w-full rounded-xl" />
          <Block className="mx-auto h-[70vh] max-w-3xl rounded-xl bg-zinc-900" />
        </div>
      </main>
    );
  }
  return (
    <main aria-label="Loading page" className="min-h-[70vh] bg-zinc-950 px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-80 max-w-full rounded-md bg-zinc-900" />
        <CardGrid />
      </div>
    </main>
  );
}
