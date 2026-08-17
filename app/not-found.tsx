import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-16">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[22rem] font-black leading-none tracking-tighter text-white/[0.04]"
      >
        404
      </span>
      <div className="relative flex w-full max-w-4xl flex-col">
        <Link
          href="/"
          className="flex w-fit items-center gap-2"
          aria-label="Hana home"
        >
          <Image
            src="/logo-v2.png"
            alt="Hana"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
          />
          <span className="header-wordmark text-lg font-bold text-zinc-50">
            Hana
          </span>
        </Link>
        <div className="mt-14 flex flex-col items-center gap-12 md:flex-row md:items-center md:gap-20">
          <Image
            src="/nezukoloading.gif"
            alt="A clueless anime girl, lost and confused"
            width={250}
            height={270}
            priority
            unoptimized
            className="h-64 w-auto shrink-0 rounded-2xl object-cover"
          />
          <div className="flex max-w-md flex-col text-center md:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
              404
            </p>
            <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight text-white">
              Page not found
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              This page wandered off somewhere and forgot the way back. Head
              home to keep browsing the catalog.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M3 9.5 12 3l9 6.5" />
                  <path d="M5 8.5V21h14V8.5" />
                </svg>
                Back to Home
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
              >
                Browse
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}