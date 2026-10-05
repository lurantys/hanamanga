import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBotUserAgent } from "@/lib/bots";

/** Auth refresh for account pages; crawler redirects before reader work. */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/read/")) {
    if (isBotUserAgent(request.headers.get("user-agent"))) {
      const mangaId = pathname.split("/")[2];
      if (mangaId) {
        const url = request.nextUrl.clone();
        url.pathname = `/manga/${mangaId}`;
        url.search = "";
        return NextResponse.redirect(url, 307);
      }
    }
    // Reader traffic never needs an auth lookup.
    return NextResponse.next({ request });
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
  const isLocalAccountPreview =
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.searchParams.get("preview") === "1";
  if (isProtected && !user && !isLocalAccountPreview) {
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
    // Match only known crawlers so human chapter views skip the proxy entirely.
    {
      source: "/read/:path*",
      has: [{
        type: "header",
        key: "user-agent",
        value: ".*([Bb][Oo][Tt]|[Ss][Pp][Ii][Dd][Ee][Rr]|[Mm][Ee][Tt][Aa]-[Ee][Xx][Tt][Ee][Rr][Nn][Aa][Ll][Aa][Gg][Ee][Nn][Tt]|[Ff][Aa][Cc][Ee][Bb][Oo][Oo][Kk]|[Ww][Hh][Aa][Tt][Ss][Aa][Pp][Pp]|[Ii][Ff][Rr][Aa][Mm][Ee][Ll][Yy]|[Gg][Oo][Oo][Gg][Ll][Ee]).*",
      }],
    },
  ],
};
