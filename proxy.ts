import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBotUserAgent } from "@/lib/bots";

/**
 * Data endpoints that exist for client-side JS (prefetch, recommendations,
 * feeds). Crawlers executing page JS hit these too, each costing seconds of
 * upstream work for zero preview benefit — answer them empty.
 */
const BOT_EMPTY_API_PATHS = new Set([
  "/api/preload-chapter",
  "/api/recommend",
  "/api/feed",
  "/api/manga",
]);

function handleBot(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Chapter URLs: send crawlers to the cached series page, which carries the
  // rich OG tags. Skips the full reader render (multi-provider fan-out).
  if (pathname === "/read" || pathname.startsWith("/read/")) {
    const segments = pathname.split("/").filter(Boolean);
    // /read/[mangaId]/[chapterId] or /read/[mangaId]
    const mangaId = segments[1];
    if (mangaId) {
      const url = request.nextUrl.clone();
      url.pathname = `/manga/${mangaId}`;
      url.search = "";
      return NextResponse.redirect(url, 307);
    }
    return null;
  }

  if (BOT_EMPTY_API_PATHS.has(pathname)) {
    return new NextResponse(null, { status: 204 });
  }

  return null;
}

export async function proxy(request: NextRequest) {
  // Cheap regex first — no I/O, and it skips the Supabase auth call below
  // for crawler traffic.
  if (isBotUserAgent(request.headers.get("user-agent"))) {
    return handleBot(request) ?? NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = request.nextUrl.pathname.startsWith("/account");
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/read/:path*",
    "/api/preload-chapter",
    "/api/recommend",
    "/api/feed",
    "/api/manga",
  ],
};
