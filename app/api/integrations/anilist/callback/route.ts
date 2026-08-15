import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { matchToMangaDex, type ImportItem } from "@/lib/integrations";

const CLIENT_ID = process.env.ANILIST_CLIENT_ID;
const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/anilist/callback`;

const ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";
const ANILIST_API = "https://graphql.anilist.co";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(
      `${SITE_URL}/login?next=/account&error=sign_in_required`,
    );
  }
  const userId = session.user.id;

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
    return NextResponse.redirect(`${SITE_URL}/account?error=anilist_token_failed`);
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

  await importAniList(userId, tokenJson.access_token);

  return NextResponse.redirect(`${SITE_URL}/account?import=anilist&ok=1`);
}

type AniListMediaList = {
  data?: {
    MediaListCollection?: {
      lists?: {
        entries?: {
          status?: string;
          progress?: number;
          media?: {
            title?: { romaji?: string; english?: string };
            synonyms?: string[];
            format?: string;
            isAdult?: boolean;
          };
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
            title { romaji english }
            synonyms
            format
            isAdult
          }
        }
      }
    }
  }
`;

async function fetchAniListList(accessToken: string): Promise<ImportItem[]> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: QUERY, variables: { userId: null } }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as AniListMediaList;
  const entries =
    json.data?.MediaListCollection?.lists?.flatMap(
      (list) => list.entries ?? [],
    ) ?? [];
  return entries
    .filter((entry) => !entry.media?.isAdult)
    .map((entry) => ({
      title: entry.media?.title?.english ?? entry.media?.title?.romaji ?? "",
      altTitles: [
        ...(entry.media?.title?.romaji ? [entry.media.title.romaji] : []),
        ...(entry.media?.title?.english ? [entry.media.title.english] : []),
        ...(entry.media?.synonyms ?? []),
      ],
      progress: entry.progress,
      status: entry.status,
    }));
}

async function importAniList(userId: string, accessToken: string): Promise<void> {
  const supabase = await createClient();
  const items = await fetchAniListList(accessToken);
  const rows: {
    user_id: string;
    manga_id: string;
    manga: unknown;
    added_at: number;
  }[] = [];
  const now = Date.now();

  let matched = 0;
  for (const item of items) {
    const manga = await matchToMangaDex(item);
    if (!manga) continue;
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
}
