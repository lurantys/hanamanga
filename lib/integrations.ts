import { fetchSearch, type Manga } from "./mangadex";
import { normalizeTitleKey, titleHits } from "./title";export type ImportItem = {
  title: string;
  altTitles?: string[];
  progress?: number;
  status?: string;
  externalId?: number;
};

/**
 * Match a title to a MangaDex manga, fetching by title and scoring
 * with the same matching logic the app uses elsewhere.
 */
export async function matchToMangaDex(item: ImportItem): Promise<Manga | null> {
  const query = item.title.trim();
  if (!query) return null;

  const needles = [query, ...(item.altTitles ?? [])]
    .map(normalizeTitleKey)
    .filter(Boolean);

  try {
    const { data } = await fetchSearch(query, 24, 60);
    let best: Manga | null = null;
    let bestScore = 0;
    for (const manga of data) {
      const candidates = [manga.title, ...(manga.altTitles ?? [])];
      for (const needle of needles) {
        if (!needle) continue;
        const hits = titleHits(needle, candidates);
        if (hits && (manga.follows ?? 0) > bestScore) {
          best = manga;
          bestScore = manga.follows ?? 0;
        }
      }
    }
    return best;
  } catch {
    return null;
  }
}
