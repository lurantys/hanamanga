import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate for /account only.
 *
 * NOTE on Fast Origin Transfer: every request matched here pays for the
 * Middleware invocation itself, and requests that continue to a Function
 * page/API route can accrue origin transfer TWICE for a single view
 * (middleware + function). This matcher is therefore deliberately minimal —
 * only the route that needs server-side auth. In particular:
 * - /read/* is intentionally NOT matched: chapter HTML is small and
 *   robots.txt already disallows /read/ for crawlers; matching it would
 *   double-charge every human chapter view.
 * - /api/* is intentionally NOT matched: those responses are small cached
 *   JSON; matching them would double-charge every client-side fetch
 *   (search-as-you-type, infinite scroll, preload).
 */
export async function proxy(request: NextRequest) {
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
  matcher: ["/account/:path*"],
};
