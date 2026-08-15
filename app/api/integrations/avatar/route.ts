import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMalAccessToken, type OAuthRow } from "@/lib/provider-sync";

const ANILIST_API = "https://graphql.anilist.co";
const MAL_API = "https://api.myanimelist.net/v2";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const avatarCache = new Map<
  string,
  { provider: string; url: string; expires: number }
>();

const VIEWER_AVATAR_QUERY = /* GraphQL */ `
  query {
    Viewer {
      avatar { large }
    }
  }
`;

async function fetchAniListAvatar(
  token: string,
): Promise<string | null> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Hana/1.0",
    },
    body: JSON.stringify({ query: VIEWER_AVATAR_QUERY }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    data?: { Viewer?: { avatar?: { large?: string | null } | null } | null };
  } | null;
  return json?.data?.Viewer?.avatar?.large ?? null;
}

async function fetchMalAvatar(token: string): Promise<string | null> {
  const res = await fetch(`${MAL_API}/users/@me?fields=picture`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { picture?: string } | null;
  return json?.picture ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const cached = avatarCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ provider: cached.provider, url: cached.url });
  }

  const { data } = await supabase
    .from("hana_oauth")
    .select("user_id, provider, access_token, refresh_token, expires_at")
    .eq("user_id", userId);
  const rows = (data ?? []) as OAuthRow[];
  const anilist = rows.find((row) => row.provider === "anilist") ?? null;
  const mal = rows.find((row) => row.provider === "mal") ?? null;

  if (anilist) {
    const url = await fetchAniListAvatar(anilist.access_token);
    if (url) {
      avatarCache.set(userId, { provider: "anilist", url, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ provider: "anilist", url });
    }
  }
  if (mal) {
    const token = await getMalAccessToken(userId, mal);
    const url = await fetchMalAvatar(token);
    if (url) {
      avatarCache.set(userId, { provider: "mal", url, expires: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ provider: "mal", url });
    }
  }

  return NextResponse.json({ error: "no_avatar" }, { status: 404 });
}
