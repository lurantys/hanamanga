import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  let next = searchParams.get("next") ?? "/account";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/login?error=oauth_failed`);
}