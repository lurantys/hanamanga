import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("hana_oauth")
    .select("access_token, synced_at")
    .eq("user_id", user.id)
    .eq("provider", "anilist")
    .maybeSingle();

  return NextResponse.json({
    connected: Boolean(data?.access_token),
    configured: Boolean(process.env.ANILIST_CLIENT_ID && process.env.ANILIST_CLIENT_SECRET),
    syncedAt: data?.synced_at ?? null,
  });
}
