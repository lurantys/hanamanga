import { getLibrarySnapshot } from "./library";
import { getContinueList } from "./progress";
import type { Manga } from "./mangadex";

export async function loadUserManga(): Promise<Manga[]> {
  const libraryEntries = Object.values(getLibrarySnapshot());
  const continueEntries = getContinueList(50);
  const byId = new Map<string, Manga>();

  for (const entry of libraryEntries) byId.set(entry.manga.id, entry.manga);

  const missing = continueEntries
    .map((entry) => entry.mangaId)
    .filter((id) => !byId.has(id));

  if (missing.length) {
    try {
      const res = await fetch(`/api/manga?ids=${missing.join(",")}`);
      if (res.ok) {
        const json = await res.json();
        for (const manga of (json?.data ?? []) as Manga[]) {
          byId.set(manga.id, manga);
        }
      }
    } catch {
      // ignore — fall back to library-only profile
    }
  }

  return [...byId.values()];
}
