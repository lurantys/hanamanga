import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="max-w-md text-center">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center gap-2"
          aria-label="Hana home"
        >
          <Image
            src="/logo-v2.png"
            alt="Hana"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-contain"
          />
          <span className="header-wordmark text-2xl font-bold text-zinc-50">
            Hana
          </span>
        </Link>
        <Image
          src="/404girl.png"
          alt="A clueless anime girl, lost and confused"
          width={220}
          height={220}
          className="mx-auto mb-6 aspect-square rounded-2xl object-cover ring-1 ring-white/10"
        />
        <p className="text-7xl font-black tracking-tight text-red-500">404</p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Looks like this page wandered off and got lost. Head back home to
          keep browsing the catalog.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white/80"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 8.5V21h14V8.5" />
          </svg>
          Back to Home
        </Link>
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <Link
            href="/browse"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Browse
          </Link>
          <span className="text-zinc-700">·</span>
          <Link
            href="/library"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Library
          </Link>
        </div>
      </div>
    </main>
  );
}