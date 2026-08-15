import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { matchToMangaDex, type ImportItem } from "@/lib/integrations";

const CLIENT_ID = process.env.MAL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAL_CLIENT_SECRET;
const REDIRECT_URI = `${SITE_URL}/api/integrations/mal/callback`;

const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_API = "https://api.myanimelist.net/v2";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
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

  if (!code || !verifier || storedState !== state) {
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

  const importResult = await importMAL(userId, tokenJson.access_token);
  if (!importResult.ok) {
    return NextResponse.redirect(
      `${SITE_URL}/account?import=mal&error=${importResult.error}`,
    );
  }

  const query = new URLSearchParams({
    import: "mal",
    ok: "1",
    count: String(importResult.imported),
  });
  const res = NextResponse.redirect(`${SITE_URL}/account?${query.toString()}`);
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

async function fetchMALList(
  accessToken: string,
): Promise<{ ok: boolean; items: ImportItem[]; error?: string }> {
  const items: ImportItem[] = [];
  let next: string | null = `${MAL_API}/users/@me/mangalist?fields=alternative_titles,my_list_status&limit=100`;
  let guard = 0;

  while (next && guard < 20) {
    guard++;
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return { ok: false, items: [], error: `api_error_${res.status}` };
    }
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
  return { ok: true, items };
}

async function importMAL(
  userId: string,
  accessToken: string,
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const supabase = await createClient();
  const list = await fetchMALList(accessToken);
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
  for (const item of list.items) {
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
  return { ok: true, imported: matched };
}
