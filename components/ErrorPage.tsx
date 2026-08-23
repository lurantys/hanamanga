import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type ErrorPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  showLogo?: boolean;
  show404?: boolean;
  className?: string;
};

export function ErrorPage({
  eyebrow,
  title,
  description,
  children,
  showLogo = true,
  show404 = false,
  className = "",
}: ErrorPageProps) {
  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-16 ${className}`}
    >
      {show404 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[22rem] font-black leading-none tracking-tighter text-white/[0.04]"
        >
          404
        </span>
      ) : null}
      <div className="relative flex w-full max-w-4xl flex-col">
        {showLogo ? (
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
        ) : null}
        <div className="mt-14 flex flex-col items-center gap-12 md:flex-row md:items-center md:gap-20">
          <Image
            src="/nezukoloading.gif"
            alt="A clueless anime girl, lost and confused"
            width={250}
            height={270}
            priority
            unoptimized
            className="h-[20.8rem] w-auto shrink-0 rounded-2xl object-cover"
          />
          <div className="flex max-w-md flex-col text-center md:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              {description}
            </p>
            {children ? (
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
