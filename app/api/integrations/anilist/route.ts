import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { randomBytes } from "crypto";

const CLIENT_ID = process.env.ANILIST_CLIENT_ID;
const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/anilist/callback`;

const ANILIST_AUTH_URL = "https://anilist.co/api/v2/oauth/authorize";

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "AniList integration is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(
      `${SITE_URL}/login?next=/account&error=sign_in_required`,
    );
  }

  const oauthState = Buffer.from(randomBytes(16)).toString("base64url");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "",
    state: oauthState,
  });

  const res = NextResponse.redirect(`${ANILIST_AUTH_URL}?${params.toString()}`);
  res.cookies.set("anilist_oauth_state", oauthState, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
