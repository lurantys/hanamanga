import Link from "next/link";
import { ErrorPage } from "@/components/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      eyebrow="404"
      title="Page not found"
      description="This page wandered off somewhere and forgot the way back. Head home to keep browsing the catalog."
      show404
    >
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
    </ErrorPage>
  );
}
