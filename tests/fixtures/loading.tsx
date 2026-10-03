"use client";

import { useState } from "react";
import { RouteSkeleton } from "@/components/RouteSkeleton";
import { BrowseGrid } from "@/components/BrowseGrid";
import { SearchLiveResults } from "@/components/SearchLiveResults";
import { MangaCard } from "@/components/MangaCard";
import { Reader } from "@/components/Reader";
import type { Manga } from "@/lib/mangadex";

const kinds = ["home", "browse", "search", "manga", "library", "account", "characters", "login", "about", "reader"] as const;
const manga = { id: "al:1", title: "Test title", genres: [], availableLanguages: [] } as Manga;

export default function LoadingFixture() {
  const [view, setView] = useState<string>("browse");
  const [query, setQuery] = useState("first");
  return <>
    <nav className="fixed top-0 left-0 z-[200] flex flex-wrap gap-2 bg-zinc-950 p-2">
      {[...kinds, "pagination", "live-search", "cover", "reader-content"].map((kind) => <button key={kind} onClick={() => setView(kind)}>{kind}</button>)}
    </nav>
    {kinds.includes(view as typeof kinds[number]) && <RouteSkeleton kind={view as typeof kinds[number]} />}
    {view === "pagination" && <div className="mx-auto max-w-7xl px-5 pt-header md:px-10"><BrowseGrid sort="popular" genres={[]} initialResults={[manga]} initialPage={1} total={100} errored={false} /></div>}
    {view === "live-search" && <div className="pt-header"><button onClick={() => setQuery("second")}>Change query</button><SearchLiveResults query={query} onPick={() => {}} /></div>}
    {view === "cover" && <div className="pt-header"><MangaCard manga={{ ...manga, coverUrl: "/broken-cover.png" }} /></div>}
    {view === "reader-content" && <Reader mangaId="al:1" mangaTitle="Test title" mangaHref="/manga/al:1" chapterLabel="Chapter 1" currentChapterId="chapter-1" chapters={[{ id: "chapter-1", label: "Chapter 1" }, { id: "chapter-2", label: "Chapter 2" }]} pages={Array.from({ length: 10 }, (_, index) => ({ id: String(index), image: `/test-page.svg?index=${index}`, width: 600, height: 800 }))} nextHref="/read/al:1/chapter-2" />}
  </>;
}
