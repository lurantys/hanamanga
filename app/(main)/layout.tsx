import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { GenreMenu } from "@/components/GenreMenu";
import { SearchBar } from "@/components/SearchBar";

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
          <span className="text-xl font-bold text-zinc-50 md:text-2xl">
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
          <span className="hidden rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 sm:inline">
            WIP
          </span>
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
    </>
  );
}
