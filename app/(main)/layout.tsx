import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { AuthButton } from "@/components/AuthButton";
import { BackToTop } from "@/components/BackToTop";
import { SearchBar } from "@/components/SearchBar";

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-zinc-950">
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-v2.png"
              alt="Hana"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="font-bold text-zinc-50">Hana</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
            Hana is a reader app only — it does not host, store, or distribute
            any manga. All titles, chapters, and images are sourced directly
            from third-party providers at the moment you open them, and all
            rights remain with their creators and publishers.
          </p>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/browse"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Browse
            </Link>
            <Link
              href="/library"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Library
            </Link>
          </nav>
        </div>
        <p className="mt-4 border-t border-white/5 pt-3 text-xs text-zinc-700">
          © {new Date().getFullYear()} Hana. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-6 z-40 flex justify-center px-4">
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
        </nav>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
          <AuthButton />
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
      <BackToTop />
    </>
  );
}
