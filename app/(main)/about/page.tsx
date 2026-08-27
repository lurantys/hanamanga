import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Hana — Hanamanga",
  description:
    "Hana is the modern manga reader by Hanamanga. Read manga, manhwa, manhua, and webtoons online at hanamanga.online.",
  openGraph: {
    title: "About Hana — Hanamanga",
    description:
      "Hana is the modern manga reader by Hanamanga. Read manga, manhwa, manhua, and webtoons online at hanamanga.online.",
    url: `${SITE_URL}/about`,
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-header pb-8 lg:pb-24 md:px-10">
      <article className="prose prose-invert prose-zinc max-w-none">
        <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          About Hana
        </h1>
        <p className="lead text-lg text-zinc-300">
          Hana is the modern manga reader from{" "}
          <span className="font-semibold text-white">Hanamanga</span>. We built
          it for readers who want a clean, fast, and beautiful way to read
          manga, manhwa, manhua, and webtoons — on any device, without the
          clutter.
        </p>

        <h2 className="text-xl font-bold text-white md:text-2xl">
          What is Hanamanga?
        </h2>
        <p className="text-zinc-300">
          Hanamanga is the team and brand behind Hana. Our goal is simple: make
          online manga reading feel as polished as streaming your favorite show.
          Whether you are catching up on trending chapters or revisiting a
          classic series, Hana keeps your place, remembers your library, and
          surfaces what to read next.
        </p>

        <h2 className="text-xl font-bold text-white md:text-2xl">
          What Hana offers
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-zinc-300">
          <li>
            <strong className="text-white">Discover & browse</strong> —
            trending, popular, and genre carousels, plus instant search and
            filtered browsing.
          </li>
          <li>
            <strong className="text-white">Personalized home feed</strong> —
            Recommended for You and New Chapters built from your library and
            reading history.
          </li>
          <li>
            <strong className="text-white">Built-in reader</strong> — smooth
            paged and webtoon modes with zoom, fit, and immersive controls.
          </li>
          <li>
            <strong className="text-white">Library & Continue Reading</strong>{" "}
            — pick up right where you left off; your progress stays on your
            device.
          </li>
          <li>
            <strong className="text-white">Track & sync</strong> — connect
            AniList or MyAnimeList to keep your reading lists in sync.
          </li>
        </ul>

        <h2 className="text-xl font-bold text-white md:text-2xl">
          Read manga online at hanamanga.online
        </h2>
        <p className="text-zinc-300">
          Hana is deployed and running at{" "}
          <a
            href={SITE_URL}
            className="font-semibold text-red-400 transition-colors duration-200 hover:text-red-300"
          >
            hanamanga.online
          </a>
          . No setup required — open it in your browser and start reading.
        </p>

        <h2 className="text-xl font-bold text-white md:text-2xl">
          Legal notice
        </h2>
        <p className="text-zinc-300">
          Hana is a reader app only — it does not host, store, or distribute any
          manga. All titles, chapters, and images are sourced directly from
          third-party providers at the moment you open them, and all rights
          remain with their creators and publishers.
        </p>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Start reading
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Browse manga
          </Link>
        </div>
      </article>
    </main>
  );
}
