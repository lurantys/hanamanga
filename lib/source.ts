export type MangaSource = "mangadex" | "atsu";

export const ATSU_ID_PREFIX = "atsu:";

export function toMangaId(source: MangaSource, ref: string): string {
  return source === "atsu" ? `${ATSU_ID_PREFIX}${ref}` : ref;
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
  return { source: "mangadex", ref: decoded };
}

export function isMangadexId(id: string): boolean {
  return !id.startsWith(ATSU_ID_PREFIX);
}

export function splitMangaIds(
  ids: string[],
): { mangadex: string[]; atsu: string[] } {
  const mangadex: string[] = [];
  const atsu: string[] = [];
  for (const id of ids) {
    const { source, ref } = parseMangaId(id);
    if (source === "atsu") atsu.push(ref);
    else mangadex.push(ref);
  }
  return { mangadex, atsu };
}
