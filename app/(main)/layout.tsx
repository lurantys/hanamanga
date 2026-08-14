import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { GenreMenu } from "@/components/GenreMenu";
import { SearchBar } from "@/components/SearchBar";

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950">
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-v2.png"
                alt="Hana"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="text-lg font-bold text-zinc-50">Hana</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Hana is a reader app only. It does not host, store, or distribute
              any manga — all titles, chapters, and images are sourced directly
              from third-party providers at the moment you open them.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Explore
            </p>
            <Link
              href="/browse"
              className="w-fit text-zinc-400 transition-colors hover:text-white"
            >
              Browse
            </Link>
            <Link
              href="/library"
              className="w-fit text-zinc-400 transition-colors hover:text-white"
            >
              Library
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6">
          <p className="text-xs leading-relaxed text-zinc-600">
            Disclaimer: Hana is an unofficial, non-commercial reader. It does
            not host or upload any content. All manga, chapters, and images are
            served by their respective third-party sources (such as MangaDex),
            and all rights remain with their creators and publishers. Hana is
            not affiliated with any content provider.
          </p>
          <p className="mt-3 text-xs text-zinc-700">
            © {new Date().getFullYear()} Hana. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <div className="flex w-fit max-w-[92vw] items-center justify-center gap-6 rounded-full border border-zinc-700/50 bg-zinc-950/70 py-3 px-3 shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/10 backdrop-blur-xl md:px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Hana home">
          <Image
            src="/logo-v2.png"
            alt="Hana"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-contain"
          />
          <span className="header-wordmark text-xl font-bold text-zinc-50 md:text-2xl">
            Hana
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-300 lg:flex">
          <Link
            href="/"
            className="relative text-zinc-50 transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-red-500 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Home
          </Link>
          <Link
            href="/browse"
            className="relative transition-colors hover:text-white after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-red-500 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Browse
          </Link>
          <Link
            href="/library"
            className="relative transition-colors hover:text-white after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-red-500 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Library
          </Link>
          <GenreMenu />
        </nav>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
