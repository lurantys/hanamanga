import { getLibrarySnapshot } from "./library";
import { getContinueList } from "./progress";
import { fetchJsonCached } from "./api-fetch";
import type { Manga } from "./mangadex";

export async function loadUserManga(): Promise<Manga[]> {
  const libraryEntries = Object.values(getLibrarySnapshot());
  const continueEntries = getContinueList(50);
  const byId = new Map<string, Manga>();

  for (const entry of libraryEntries) byId.set(entry.manga.id, entry.manga);

  const missing = [
    ...continueEntries
      .map((entry) => entry.mangaId)
      .filter((id) => !byId.has(id)),
    ...libraryEntries
      .filter((entry) => !(entry.manga.genres?.length))
      .map((entry) => entry.manga.id),
  ].filter((id) => !byId.has(id) || !(byId.get(id)?.genres?.length));

  if (missing.length) {
    try {
      const json = await fetchJsonCached<{ data?: Manga[] }>(
        `/api/manga?ids=${missing.join(",")}`,
      );
      for (const manga of json?.data ?? []) {
        byId.set(manga.id, manga);
      }
    } catch {
      // ignore — fall back to library-only profile
    }
  }

  return [...byId.values()];
}
