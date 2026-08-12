import { MangaCard } from "./MangaCard";
import { Carousel } from "./Carousel";
import type { Manga } from "@/lib/mangadex";

type MangaRowProps = {
  title: string;
  manga: Manga[];
};

export function MangaRow({ title, manga }: MangaRowProps) {
  return (
    <Carousel title={title} ariaLabel={title}>
      {manga.map((item) => (
        <MangaCard key={item.id} manga={item} />
      ))}
    </Carousel>
  );
}
