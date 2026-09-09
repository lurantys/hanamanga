const COVER_PROXY_PATH = "/api/cover";
const UPLOADS_HOST = "uploads.mangadex.org";
const UPLOADS = "https://uploads.mangadex.org";

/**
 * MangaDex serves a "You can read this at..." placeholder for any cover
 * hotlinked from a non-MangaDex domain (see api.mangadex.org/docs/2-limitations).
 * Browsers send our origin as Referer, so direct `uploads.mangadex.org` URLs
 * always render the watermark. Proxying server-side (no browser Referer,
 * `Referer: https://mangadex.org/`) returns the real cover.
 *
 * This helper rewrites upstream cover URLs to the same-origin proxy. It is
 * idempotent: already-proxied or non-MangaDex URLs pass through untouched,
 * so stored library snapshots with legacy upstream URLs are healed at render.
 */
export function coverDisplayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(COVER_PROXY_PATH)) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== UPLOADS_HOST) return url;
  if (!parsed.pathname.startsWith("/covers/")) return url;
  return `${COVER_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

/** Build a proxied cover URL from MangaDex parts (used at normalize time). */
export function proxiedMangadexCover(mangaId: string, fileName: string): string {
  const upstream = `${UPLOADS}/covers/${mangaId}/${fileName}.256.jpg`;
  return `${COVER_PROXY_PATH}?url=${encodeURIComponent(upstream)}`;
}

/**
 * Resolve a (possibly proxied) cover URL back to the upstream URL for
 * server-side fetches (OG images). Avoids a self-hop through the proxy and
 * lets server code fetch MangaDex directly with proper headers.
 */
export function upstreamCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith(COVER_PROXY_PATH)) return url;
  try {
    // Relative URL: supply a dummy base for parsing.
    const parsed = new URL(url, "https://hana.local");
    const inner = parsed.searchParams.get("url");
    return inner && inner.startsWith("https://") ? inner : url;
  } catch {
    return url;
  }
}
