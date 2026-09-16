import { NextResponse } from "next/server";
import { ATSU_CDN } from "@/lib/atsu";

export const dynamic = "force-dynamic";

// cdn.atsu.moe 403s real-browser image loads (Cloudflare flags the
// cross-site Sec-Fetch metadata), while plain server-side fetches return
// 200. So page/poster bytes must flow through this same-origin route: the
// browser's request is same-origin (nothing to flag) and the upstream fetch
// carries no browser fetch-metadata (nothing to trigger the rule).
//
// Page/poster URLs are immutable content addresses, so edge-cache them hard:
// after the first MISS the bytes serve from the edge, not the Function.
const ALLOWED_PATH = /^\/static\/(pages|posters)\/[A-Za-z0-9._\-/]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("u")?.trim() ?? "";
  if (!raw || raw.includes("..") || !ALLOWED_PATH.test(raw)) {
    return NextResponse.json({ error: "bad image path" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${ATSU_CDN}${raw}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hana/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "upstream unavailable" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
