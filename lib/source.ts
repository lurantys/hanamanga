export type MangaSource = "mangadex" | "atsu" | "al";

export const ATSU_ID_PREFIX = "atsu:";
export const ANILIST_ID_PREFIX = "al:";

export function toMangaId(source: MangaSource, ref: string): string {
  if (source === "atsu") return `${ATSU_ID_PREFIX}${ref}`;
  if (source === "al") return `${ANILIST_ID_PREFIX}${ref}`;
  return ref;
}

export function parseMangaId(
  id: string,
): { source: MangaSource; ref: string } {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // keep the raw value on malformed percent-encoding
  }
  if (decoded.startsWith(ATSU_ID_PREFIX)) {
    return { source: "atsu", ref: decoded.slice(ATSU_ID_PREFIX.length) };
  }
  if (decoded.startsWith(ANILIST_ID_PREFIX)) {
    return { source: "al", ref: decoded.slice(ANILIST_ID_PREFIX.length) };
  }
  return { source: "mangadex", ref: decoded };
}

export function isMangadexId(id: string): boolean {
  return !id.startsWith(ATSU_ID_PREFIX) && !id.startsWith(ANILIST_ID_PREFIX);
}

export function splitMangaIds(
  ids: string[],
): { mangadex: string[]; atsu: string[]; al: string[] } {
  const mangadex: string[] = [];
  const atsu: string[] = [];
  const al: string[] = [];
  for (const id of ids) {
    const { source, ref } = parseMangaId(id);
    if (source === "atsu") atsu.push(ref);
    else if (source === "al") al.push(ref);
    else mangadex.push(ref);
  }
  return { mangadex, atsu, al };
}
