import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import type { Manga } from "@/lib/mangadex";
import { anilistToManga, ANILIST_MEDIA_FIELDS, fetchAniListViewerId, type AniListMedia } from "@/lib/anilist";

const CLIENT_ID = process.env.ANILIST_CLIENT_ID;
const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/anilist/callback`;

const ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";
const ANILIST_API = "https://graphql.anilist.co";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("anilist_oauth_state")?.value;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.redirect(
      `${SITE_URL}/login?next=/account&error=sign_in_required`,
    );
  }
  const userId = user.id;

  if (!code || !state || !storedState || storedState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/account?error=anilist_state_failed`,
    );
  }

  const tokenRes = await fetch(ANILIST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error("AniList token exchange failed", {
      status: tokenRes.status,
      body: tokenJson,
    });
    const res = NextResponse.redirect(
      `${SITE_URL}/account?error=anilist_token_failed`,
    );
    res.cookies.delete("anilist_oauth_state");
    return res;
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : null;

  await supabase.from("hana_oauth").upsert(
    {
      user_id: userId,
      provider: "anilist",
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
    },
    { onConflict: "user_id,provider" },
  );

  const importResult = await importAniList(userId, tokenJson.access_token);
  if (!importResult.ok) {
    return NextResponse.redirect(
      `${SITE_URL}/account?import=anilist&error=${importResult.error}`,
    );
  }

  const query = new URLSearchParams({
    import: "anilist",
    ok: "1",
    count: String(importResult.imported),
  });
  const res = NextResponse.redirect(`${SITE_URL}/account?${query.toString()}`);
  res.cookies.delete("anilist_oauth_state");
  return res;
}

type AniListMediaList = {
  data?: {
    MediaListCollection?: {
      lists?: {
        entries?: {
          status?: string;
          progress?: number;
          media?: AniListMedia | null;
        }[];
      }[];
    };
  };
};

const QUERY = /* GraphQL */ `
  query ($userId: Int) {
    MediaListCollection(userId: $userId, type: MANGA) {
      lists {
        entries {
          status
          progress
          media {
            ${ANILIST_MEDIA_FIELDS}
          }
        }
      }
    }
  }
`;

async function fetchAniListList(
  accessToken: string,
): Promise<{ ok: boolean; items: Manga[]; error?: string }> {
  let userId: number;
  try {
    userId = await fetchAniListViewerId(accessToken);
  } catch (error) {
    console.error("AniList viewer id fetch failed", error);
    return { ok: false, items: [], error: "api_error_no_data" };
  }
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: QUERY, variables: { userId } }),
  });
  if (!res.ok) {
    void res.text().catch(() => "");
    return { ok: false, items: [], error: `api_error_${res.status}` };
  }
  const json = (await res.json()) as AniListMediaList;
  if (!json.data?.MediaListCollection) {
    return { ok: false, items: [], error: "api_error_no_data" };
  }
  const entries =
    json.data.MediaListCollection.lists?.flatMap((list) => list.entries ?? []) ??
    [];
  const items = entries
    .filter((entry): entry is { media: AniListMedia } => Boolean(entry.media))
    .filter((entry) => !entry.media.isAdult)
    .filter(
      (entry) =>
        entry.media.format !== "NOVEL" && entry.media.format !== "ONE_SHOT",
    )
    .map((entry) => anilistToManga(entry.media));
  return { ok: true, items };
}

async function importAniList(
  userId: string,
  accessToken: string,
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const supabase = await createClient();
  const list = await fetchAniListList(accessToken);
  if (!list.ok) {
    return { ok: false, imported: 0, error: list.error };
  }
  const rows: {
    user_id: string;
    manga_id: string;
    manga: unknown;
    added_at: number;
  }[] = [];
  const now = Date.now();

  let matched = 0;
  for (const manga of list.items) {
    matched++;
    rows.push({
      user_id: userId,
      manga_id: manga.id,
      manga,
      added_at: now - matched,
    });
  }

  if (rows.length) {
    await supabase.from("hana_library").upsert(rows, {
      onConflict: "user_id,manga_id",
    });
  }
  return { ok: true, imported: matched };
}
