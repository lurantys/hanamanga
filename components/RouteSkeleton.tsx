import { MangaGridSkeleton } from "./MangaCardSkeleton";
import { HeroLoading } from "./HeroLoading";
import { MangaRowLoading } from "./MangaRowLoading";

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
  return <div aria-hidden className={`motion-safe:animate-pulse rounded-xl bg-zinc-800/80 ${className}`} />;
}

function CardGrid({ count = 12 }: { count?: number }) {
  return <MangaGridSkeleton count={count} />;
}

function HomeSkeleton() {
  return (
    <main aria-label="Loading home page" aria-busy="true" className="min-h-screen bg-zinc-950 pb-24">
      <HeroLoading />
      <div className="relative z-10 -mt-6 space-y-10 md:-mt-16">
        {[
          "Trending Now",
          "Manga",
          "Webtoons & Manhwa",
          "Manhua",
        ].map((title) => (
          <MangaRowLoading key={title} title={title} />
        ))}
      </div>
    </main>
  );
}

function BrowseSkeleton() {
  return (
    <main aria-label="Loading browse page" aria-busy="true" className="bg-zinc-950 pb-8 lg:pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <div className="mb-6"><Block className="h-8 w-36" /><Block className="mt-1 h-5 w-80 max-w-full" /></div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Block className="h-10 w-80 max-w-full rounded-full" />
          <Block className="h-10 w-32 rounded-full" />
          <Block className="h-10 w-32 rounded-full" />
          <Block className="h-10 w-24 rounded-full" />
        </div>
        <Block className="mb-5 h-5 w-48" />
        <CardGrid />
      </div>
    </main>
  );
}

function SearchSkeleton() {
  return (
    <main aria-label="Loading search results" aria-busy="true" className="bg-zinc-950 pb-8 lg:pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <Block className="mb-1 h-8 w-56" />
        <Block className="mb-6 mt-4 h-[54px] w-full rounded-full lg:hidden" />
        <Block className="mb-5 h-5 w-64 max-w-full" />
        <CardGrid />
      </div>
    </main>
  );
}

function MangaSkeleton() {
  return (
    <main aria-label="Loading manga page" aria-busy="true" className="min-h-screen bg-zinc-950 pb-24">
      <Block className="h-[34dvh] min-h-[260px] rounded-none bg-gradient-to-t from-zinc-950 to-zinc-800 md:h-[46dvh] md:min-h-[320px]" />
      <div className="relative z-10 mx-auto -mt-44 max-w-lg px-5 md:hidden">
        <div className="flex flex-col items-center text-center">
          <Block className="aspect-[2/3] w-[48vw] max-w-[220px] rounded-[14px]" />
          <Block className="mx-auto mt-5 h-7 w-2/3 max-w-sm rounded-md" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Block className="h-7 w-20 rounded-full" />
            <Block className="h-7 w-24 rounded-full" />
            <Block className="h-7 w-20 rounded-full" />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Block className="h-11 w-32 rounded-xl" />
            <Block className="h-11 w-36 rounded-xl" />
          </div>
        </div>
        <div className="mx-auto mt-6 space-y-2 rounded-2xl border border-white/[0.06] p-4">
          {Array.from({ length: 6 }, (_, index) => <Block key={index} className={`h-4 ${index === 5 ? "w-3/4" : "w-full"}`} />)}
          <Block className="mt-3 h-4 w-20" />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: 4 }, (_, index) => <Block key={index} className="h-7 w-20 rounded-full" />)}
        </div>
        <div className="mx-auto mt-6 space-y-3 rounded-2xl border border-white/[0.06] px-4 py-4">
          <Block className="h-5 w-48" /><Block className="h-5 w-32" />
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-52 hidden max-w-5xl px-10 md:block">
        <div className="flex items-start gap-10">
          <Block className="aspect-[2/3] w-56 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-5 pb-2">
            <Block className="h-11 w-3/4 max-w-xl rounded-md" />
            <div className="flex flex-wrap gap-2">
              <Block className="h-7 w-20 rounded-md" />
              <Block className="h-7 w-24 rounded-md" />
              <Block className="h-7 w-20 rounded-md" />
              <Block className="h-7 w-24 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Block className="h-11 w-32 rounded-xl" />
              <Block className="h-11 w-36 rounded-xl" />
            </div>
            <Block className="h-px w-full rounded-none" />
            <Block className="h-20 max-w-2xl rounded-xl" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }, (_, index) => <Block key={index} className="h-7 w-20 rounded-full" />)}
            </div>
            <div className="space-y-3 pt-1">
              <Block className="h-5 w-48 rounded-md" />
              <Block className="h-5 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-12 max-w-5xl px-5 md:px-10">
        <div className="mb-5 flex items-baseline gap-3">
          <Block className="h-6 w-36 rounded-md" />
          <Block className="h-4 w-32 rounded-md bg-zinc-900" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => <Block key={index} className="h-14 rounded-xl" />)}
        </div>
      </div>
    </main>
  );
}

function LibrarySkeleton() {
  return (
    <main aria-label="Loading library" aria-busy="true" className="bg-zinc-950 pb-8 lg:pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <div className="mb-6"><Block className="h-8 w-40" /><Block className="mt-1 h-5 w-72 max-w-full" /></div>
        <div className="flex flex-wrap items-center gap-3">
          <Block className="h-11 min-w-0 flex-1 basis-56 rounded-full" />
          <Block className="h-11 w-72 max-w-full rounded-full" />
          <Block className="h-11 w-36 rounded-full" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => <div key={index}><Block className="aspect-[2/3] rounded-lg" /><Block className="mt-2 h-5 w-4/5" /><Block className="mt-1 h-4 w-2/5" /></div>)}
        </div>
      </div>
    </main>
  );
}

function AccountSkeleton() {
  return (
    <main aria-label="Loading account" aria-busy="true" className="min-h-screen bg-zinc-950 pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-header sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 border-b border-white/10 pb-7 sm:gap-6 sm:pb-8">
          <Block className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1"><Block className="h-9 w-48 max-w-full" /><Block className="mt-2 h-5 w-64 max-w-full" /></div>
        </div>
        <div className="mt-7 sm:mt-8">
          <Block className="mb-3 h-6 w-32" />
          <div className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="py-5 sm:py-6"><Block className="h-9 w-16" /><Block className="mt-2 h-4 w-28" /></div>)}
          </div>
        </div>
        <div className="mt-8 grid items-start gap-4 sm:mt-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-5">
          <Block className="h-64 rounded-2xl" /><Block className="h-80 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

function CharactersSkeleton() {
  return (
    <main aria-label="Loading characters" aria-busy="true" className="mx-auto w-full max-w-5xl px-5 pb-24 pt-header md:px-10">
      <Block className="h-5 w-48" />
      <Block className="mb-6 mt-6 h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => <div key={index} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60"><Block className="aspect-[3/4] rounded-none" /><div className="p-3"><Block className="h-5 w-4/5" /><Block className="mt-1 h-4 w-2/5" /></div></div>)}
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <main aria-label="Loading sign in" aria-busy="true" className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 pb-24 pt-header">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3"><Block className="h-16 w-16 rounded-2xl" /><Block className="h-9 w-24" /></div>
        <Block className="h-12 rounded-full" />
        <Block className="mx-auto mt-8 h-9 w-56" />
        <Block className="mx-auto mt-2 h-5 w-64 max-w-full" />
        <Block className="mt-6 h-12 rounded-lg" />
        <Block className="my-5 h-4 w-full" />
        <div className="space-y-3"><Block className="h-12 rounded-lg" /><Block className="h-12 rounded-lg" /><Block className="h-12 rounded-lg" /></div>
      </div>
    </main>
  );
}

function AboutSkeleton() {
  return (
    <main aria-label="Loading about page" aria-busy="true" className="mx-auto w-full max-w-3xl px-5 pb-8 pt-header md:px-10 lg:pb-24">
      <Block className="h-9 w-48" />
      <div className="mt-3 space-y-2"><Block className="h-5 w-full" /><Block className="h-5 w-full" /><Block className="h-5 w-4/5" /></div>
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="mt-6"><Block className="mb-3 h-7 w-64 max-w-full" /><div className="space-y-2"><Block className="h-4 w-full" /><Block className="h-4 w-full" /><Block className="h-4 w-3/4" /></div></div>)}
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
      <main aria-label="Loading chapter" aria-busy="true" className="min-h-screen bg-zinc-950 pb-24">
        <div className="border-b border-white/10">
          <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4">
            <Block className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1"><Block className="h-4 w-3/4" /><Block className="h-3 w-24" /></div>
            <Block className="h-9 w-9 shrink-0 rounded-lg" />
          </div>
        </div>
        <Block className="mx-auto mt-8 h-[calc(100dvh-8rem)] w-full max-w-3xl rounded-none bg-zinc-900" />
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
