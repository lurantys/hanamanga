import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { randomBytes } from "crypto";

const CLIENT_ID = process.env.MAL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAL_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/mal/callback`;

const MAL_AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";

function base64Url(input: Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "MyAnimeList integration is not configured." },
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

  const verifier = base64Url(randomBytes(64)).replace(/=+$/, "");
  const challenge = verifier;
  const oauthState = base64Url(randomBytes(16));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    code_challenge: challenge,
    code_challenge_method: "plain",
    state: oauthState,
    redirect_uri: REDIRECT_URI,
  });

  const res = NextResponse.redirect(`${MAL_AUTH_URL}?${params.toString()}`);
  res.cookies.set("mal_oauth_verifier", verifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  res.cookies.set("mal_oauth_state", oauthState, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
