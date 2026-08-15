import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { matchToMangaDex, type ImportItem } from "@/lib/integrations";
import { createHash, randomBytes } from "crypto";

const CLIENT_ID = process.env.MAL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAL_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/mal/callback`;

const MAL_AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_API = "https://api.myanimelist.net/v2";

function base64Url(input: Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
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
    const challenge = base64Url(
      createHash("sha256").update(verifier).digest(),
    ).replace(/=+$/, "");
    const oauthState = base64Url(randomBytes(16));

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      code_challenge: challenge,
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

  const verifier = request.cookies.get("mal_oauth_verifier")?.value;
  const storedState = request.cookies.get("mal_oauth_state")?.value;

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

  if (!verifier || storedState !== state) {
    return NextResponse.redirect(`${SITE_URL}/account?error=mal_state_failed`);
  }

  const tokenRes = await fetch(MAL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(`${SITE_URL}/account?error=mal_token_failed`);
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : null;

  await supabase.from("hana_oauth").upsert(
    {
      user_id: userId,
      provider: "mal",
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
    },
    { onConflict: "user_id,provider" },
  );

  await importMAL(userId, tokenJson.access_token);

  const res = NextResponse.redirect(`${SITE_URL}/account?import=mal&ok=1`);
  res.cookies.delete("mal_oauth_verifier");
  res.cookies.delete("mal_oauth_state");
  return res;
}

type MalMangaList = {
  data?: {
    node?: {
      id?: number;
      title?: string;
      alternative_titles?: { synonyms?: string[]; en?: string; ja?: string };
      my_list_status?: {
        status?: string;
        num_chapters_read?: number;
        is_rereading?: boolean;
      };
    };
  }[];
  paging?: { next?: string | null };
};

async function fetchMALList(accessToken: string): Promise<ImportItem[]> {
  const items: ImportItem[] = [];
  let next: string | null = `${MAL_API}/users/@me/mangalist?fields=alternative_titles,my_list_status&limit=100`;
  let guard = 0;

  while (next && guard < 20) {
    guard++;
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const json = (await res.json()) as MalMangaList;
    for (const entry of json.data ?? []) {
      const title =
        entry.node?.title ?? entry.node?.alternative_titles?.en ?? "";
      const altTitles = [
        entry.node?.alternative_titles?.en,
        entry.node?.alternative_titles?.ja,
        ...(entry.node?.alternative_titles?.synonyms ?? []),
      ].filter((value): value is string => Boolean(value));
      items.push({
        title,
        altTitles,
        progress: entry.node?.my_list_status?.num_chapters_read,
        status: entry.node?.my_list_status?.status,
      });
    }
    next = json.paging?.next ?? null;
  }
  return items;
}

async function importMAL(userId: string, accessToken: string): Promise<void> {
  const supabase = await createClient();
  const items = await fetchMALList(accessToken);
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
