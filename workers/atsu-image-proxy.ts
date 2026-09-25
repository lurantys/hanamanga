interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

declare const caches: CacheStorage & { default: Cache };

const ATSU_CDN = "https://cdn.atsu.moe";
const ALLOWED_PATH = /^\/static\/(pages|posters)\/[A-Za-z0-9._\-/]+$/;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

const worker = {
  async fetch(
    request: Request,
    _env: unknown,
    ctx: WorkerExecutionContext,
  ): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }

    const raw = new URL(request.url).searchParams.get("u")?.trim() ?? "";
    if (
      !raw ||
      raw.length > 1024 ||
      raw.includes("..") ||
      !ALLOWED_PATH.test(raw)
    ) {
      return jsonError("bad image path", 400);
    }

    // Key by the immutable upstream path, independent of the public Worker URL.
    const upstreamUrl = `${ATSU_CDN}${raw}`;
    const cacheKey = new Request(upstreamUrl, { method: "GET" });
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Image-Cache", "HIT");
      return new Response(cached.body, {
        status: cached.status,
        headers,
      });
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Hana/1.0)",
        },
      });
      if (!upstream.ok || !upstream.body) {
        return jsonError(
          "upstream unavailable",
          upstream.status === 404 ? 404 : 502,
        );
      }

      const contentLength = Number(upstream.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        return jsonError("image too large", 413);
      }

      const contentType =
        upstream.headers.get("content-type") ?? "application/octet-stream";
      if (!contentType.startsWith("image/")) {
        return jsonError("not an image", 502);
      }

      const headers = new Headers({
        "Content-Type": contentType,
        "Cache-Control": IMAGE_CACHE_CONTROL,
        "X-Image-Cache": "MISS",
      });
      if (Number.isFinite(contentLength) && contentLength > 0) {
        headers.set("Content-Length", String(contentLength));
      }

      const response = new Response(upstream.body, { headers });
      const cacheResponse = response.clone();
      cacheResponse.headers.set("X-Image-Cache", "HIT");
      ctx.waitUntil(caches.default.put(cacheKey, cacheResponse).catch(() => {}));
      return response;
    } catch {
      return jsonError("unavailable", 502);
    }
  },
};

export default worker;
