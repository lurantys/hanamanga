import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

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

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "",
  });
  return NextResponse.redirect(`${ANILIST_AUTH_URL}?${params.toString()}`);
}
