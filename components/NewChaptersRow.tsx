import { Carousel } from "./Carousel";
import { MangaCard } from "./MangaCard";
import { getNewReleases } from "@/lib/read";

export async function NewChaptersRow() {
  const { data } = await getNewReleases(18);

  if (data.length === 0) return null;

  return (
    <Carousel title="New Releases" ariaLabel="New Releases">
      {data.map((manga) => (
        <MangaCard key={manga.id} manga={manga} />
      ))}
    </Carousel>
  );
}
