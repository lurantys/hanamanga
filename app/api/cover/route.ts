import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPLOADS_HOST = "uploads.mangadex.org";
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Same-origin proxy for MangaDex covers.
 *
 * MangaDex anti-hotlink protection serves the "You can read this at..."
 * placeholder to any image request whose Referer isn't MangaDex-owned.
 * Fetching server-side with `Referer: https://mangadex.org/` returns the
 * real cover; the response is cached at the edge (s-maxage) and in the
 * browser, so per-cover upstream cost is paid once.
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
    const upstream = await fetch(target.toString(), {
      headers: {
        // Browser-like UA + MangaDex Referer bypasses hotlink protection.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hana/1.0",
        Referer: "https://mangadex.org/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
      // Cache upstream bytes at the edge for a day; covers rarely change.
      next: { revalidate: 86_400 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream unavailable" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }
    const mime = (upstream.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    if (mime && !ALLOWED_CONTENT_TYPES.has(mime) && !mime.startsWith("image/")) {
      return NextResponse.json({ error: "unexpected content" }, { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    if (!buffer.byteLength) {
      return NextResponse.json({ error: "empty image" }, { status: 502 });
    }
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime || "image/jpeg",
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
