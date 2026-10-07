"use client";

import Link from "next/link";
import { useState } from "react";
import { AtsuChapterList } from "@/components/AtsuChapterList";
import { MangaChapterList } from "@/components/MangaChapterList";
import { Reader } from "@/components/Reader";

const chapters = Array.from({ length: 60 }, (_, i) => ({
  id: `chapter-${i + 1}`, label: `Chapter ${i + 1}`,
}));

export default function MobileScrollFixture() {
  const [view, setView] = useState("atsu");
  return <>
    <nav className="flex gap-4 p-4">
      {["atsu", "mangadex", "reader"].map((name) =>
        <button key={name} onClick={() => setView(name)}>{name}</button>)}
      <Link href="/mobile-scroll-regression-fixture?destination=1">Navigate</Link>
    </nav>
    {view === "atsu" && <AtsuChapterList mangaId="scroll-test" mangaTitle="Scroll test"
      scanlators={[{ id: "group", name: "Test group" }]}
      chapters={chapters.map((chapter, i) => ({ ...chapter, scanlationMangaId: "group", title: null,
        number: i + 1, createdAt: 0, index: i, pageCount: 10 }))} />}
    {view === "mangadex" && <MangaChapterList mangaId="scroll-test" mangaTitle="Scroll test"
      volumes={[{ volume: "1", chapters: chapters.map((chapter, i) => ({ ...chapter,
        chapter: String(i + 1), pages: 10, translatedLanguage: "en" })) }]} />}
    {view === "reader" && <Reader mangaId="scroll-test" mangaTitle="Scroll test"
      mangaHref="/manga/scroll-test" chapterLabel="Chapter 30" currentChapterId="chapter-30"
      chapters={chapters} pages={[{ id: "page", image: "/scroll-test-page.svg", width: 600, height: 1600 }]} />}
  </>;
}
