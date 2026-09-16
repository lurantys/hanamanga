import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPLOADS_HOST = "uploads.mangadex.org";

/**
 * Backwards-compatibility shim for legacy `/api/cover?url=…` URLs still
 * present in CDN-cached HTML and stored library snapshots.
 *
 * Previously this route proxied full image bytes through the Function
 * (each MISS billed the whole file as Fast Origin Transfer). It now issues
 * a cacheable 302 to the upstream file instead: ~0.5KB per miss, and the
 * image bytes flow MangaDex -> visitor directly. New code never generates
 * these URLs (see `lib/cover-proxy.ts`); this route exists only so old
 * references keep rendering while caches turn over, and can be deleted
 * once no `/api/cover` URLs remain in the wild.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (
    target.protocol !== "https:" ||
    target.hostname !== UPLOADS_HOST ||
    !target.pathname.startsWith("/covers/")
  ) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }

  try {
    // Validate the upstream responds before redirecting, so broken covers
    // 404 fast instead of bouncing the browser to a dead file. HEAD keeps
    // the Function's own transfer to headers-only (~0.5KB); image bytes
    // never pass through Vercel.
    const upstream = await fetch(target.toString(), {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hana/1.0",
        Referer: "https://mangadex.org/",
      },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86_400 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream unavailable" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }
    return NextResponse.redirect(target.toString(), {
      status: 302,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
