import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProviders } from "@/lib/provider-sync";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await syncProviders(user.id);
  return NextResponse.json(summary);
}
