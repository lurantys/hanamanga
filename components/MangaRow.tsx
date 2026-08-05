import { MangaCard } from "./MangaCard";
import type { Manga } from "@/lib/mangadex";

type MangaRowProps = {
  title: string;
  manga: Manga[];
};

export function MangaRow({ title, manga }: MangaRowProps) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 px-4 text-lg font-bold tracking-tight text-zinc-100 md:px-10">
        {title}
      </h2>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 py-2 md:px-10">
        {manga.map((item) => (
          <MangaCard key={item.id} manga={item} />
        ))}
      </div>
    </section>
  );
}
