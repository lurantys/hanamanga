import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProviders } from "@/lib/provider-sync";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await syncProviders(session.user.id);
  return NextResponse.json(summary);
}
