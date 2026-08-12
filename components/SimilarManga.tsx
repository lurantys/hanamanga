import { MangaRow } from "./MangaRow";
import { fetchMangaList, getTagId } from "@/lib/mangadex";
import type { Manga } from "@/lib/mangadex";

export async function SimilarManga({ manga }: { manga: Manga }) {
  if (!manga.genres.length) return null;

  const ids = (
    await Promise.all(manga.genres.map((genre) => getTagId(genre)))
  ).filter((id): id is string => Boolean(id));
  if (!ids.length) return null;

  const { data } = await fetchMangaList({
    includedTags: ids,
    order: { followedCount: "desc" },
    limit: 19,
  });
  const similar = data.filter((item) => item.id !== manga.id).slice(0, 18);
  if (!similar.length) return null;

  return <MangaRow title="More like this" manga={similar} />;
}
