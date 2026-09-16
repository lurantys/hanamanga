import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { UPLOADS } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

// MangaDex@Home page URLs embed a temporary server assignment (~15min), so
// baking them into HTML breaks every revisited chapter once the cached
// reader props go stale — exactly the prod "resume shows failed pages"
// reports. This same-origin route keeps a forever-stable URL: the chapter
// hash + filename are immutable content addresses (edge-cached hard), and
// only a cache MISS resolves a fresh at-home upstream.
const CHAPTER_ID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HASH = /^[0-9a-fA-F]{32}$/;
const FILE =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|gif|webp|avif)$/i;

// Assignments stay valid ~15min; memoize well inside that window so a cold
// chapter costs ~1 assignment call, not one per page. Bytes themselves are
// immutable per hash+file, so this memo can never serve wrong content.
const cachedAtHomeBase = unstable_cache(
  async (chapterId: string): Promise<string> => {
    const res = await fetch(
      `https://api.mangadex.org/at-home/server/${chapterId}`,
      {
        headers: { "User-Agent": "Hana/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) throw new Error(`at-home assignment failed: ${res.status}`);
    const json = (await res.json()) as { baseUrl?: string };
    return json.baseUrl ?? "";
  },
  ["md-athome-base"],
  { revalidate: 600 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapter = searchParams.get("chapter")?.trim() ?? "";
  const hash = searchParams.get("hash")?.trim() ?? "";
  const file = searchParams.get("file")?.trim() ?? "";
  if (
    !CHAPTER_ID.test(chapter) ||
    !HASH.test(hash) ||
    !FILE.test(file) ||
    file.includes("..")
  ) {
    return NextResponse.json({ error: "bad image reference" }, { status: 400 });
  }

  try {
    const base = await cachedAtHomeBase(chapter);
    // Empty assignment → fall back to the uploads host (non-expiring).
    const upstream = `${base || UPLOADS}/data/${hash}/${file}`;
    const res = await fetch(upstream, {
      headers: { "User-Agent": "Hana/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: "upstream unavailable" },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }
    return new Response(res.body, {
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
