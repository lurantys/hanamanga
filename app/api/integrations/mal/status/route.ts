import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("hana_oauth")
    .select("access_token")
    .eq("user_id", session.user.id)
    .eq("provider", "mal")
    .maybeSingle();

  return NextResponse.json({
    connected: Boolean(data?.access_token),
    configured: Boolean(process.env.MAL_CLIENT_ID && process.env.MAL_CLIENT_SECRET),
  });
}
