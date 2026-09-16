const COVER_PROXY_PATH = "/api/cover";
const UPLOADS_HOST = "uploads.mangadex.org";
const UPLOADS = "https://uploads.mangadex.org";

/**
 * MangaDex serves a "You can read this at..." placeholder for cover requests
 * whose Referer is a non-MangaDex origin. Browsers loading
 * `uploads.mangadex.org` directly with our origin as Referer used to get the
 * watermark, which is why covers were proxied through `/api/cover`.
 *
 * That proxy streams every cover byte through a Vercel Function, and each
 * cache MISS bills the full image as Fast Origin Transfer (CDN <-> Function,
 * ~100-500KB per unique cover). With dozens of covers per page this was the
 * dominant origin-transfer driver.
 *
 * Fix: load covers directly from `uploads.mangadex.org` with
 * `referrerPolicy="no-referrer"` on the <img> (MangaDex serves the real cover
 * when the request carries no Referer). Cover bytes then flow
 * MangaDex -> visitor directly: zero Vercel Function involvement, zero Fast
 * Origin Transfer. `/api/cover` is kept as a tiny 302-redirect shim so older
 * cached HTML / stored library snapshots that still point at it keep working
 * at ~0.5KB per miss instead of ~500KB.
 *
 * This helper now resolves everything to the direct upstream URL. It stays
 * idempotent: already-direct, already-proxied, and non-MangaDex URLs all
 * resolve to a renderable direct URL.
 */
export function coverDisplayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Heal legacy proxied URLs back to the direct upstream URL.
  const upstream = upstreamCoverUrl(url);
  if (!upstream) return null;
  let parsed: URL;
  try {
    parsed = new URL(upstream);
  } catch {
    return url;
  }
  // Only MangaDex uploads need healing; everything else passes through.
  if (parsed.hostname !== UPLOADS_HOST) return upstream;
  if (!parsed.pathname.startsWith("/covers/")) return upstream;
  return upstream;
}

/** Build a direct MangaDex cover URL from parts (no proxy hop). */
export function proxiedMangadexCover(mangaId: string, fileName: string): string {
  return `${UPLOADS}/covers/${mangaId}/${fileName}.256.jpg`;
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
