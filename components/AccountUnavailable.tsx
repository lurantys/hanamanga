import Image from "next/image";
import Link from "next/link";
import { ctaPrimary, ctaSecondary } from "@/lib/ui";

export function AccountUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 pb-28 pt-header">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <Image
          src="/nezukoloading.gif"
          alt="Nezuko running"
          width={250}
          height={270}
          priority
          unoptimized
          className="mb-8 h-44 w-auto rounded-2xl object-contain sm:h-56"
        />
        <p className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
          Account revamp
        </p>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          Account system is temporarily unavailable
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
          We’re working on a revamp of the account experience. Sign-in,
          account creation, and cloud sync are paused for now.
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          You can keep browsing and reading. Your library and reading progress
          will be saved on this device while we’re away.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/browse" className={ctaPrimary}>
            Keep browsing
          </Link>
          <Link href="/library" className={ctaSecondary}>
            Your library
          </Link>
        </div>
      </div>
    </main>
  );
}
