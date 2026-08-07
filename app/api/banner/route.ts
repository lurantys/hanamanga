import { NextResponse } from "next/server";
import { bannerForManga } from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const anilistId = searchParams.get("anilistId")?.trim() || undefined;
  if (!title && !anilistId) return NextResponse.json({ bannerUrl: null });
  try {
    const bannerUrl = await bannerForManga({ title, anilistId });
    return NextResponse.json({ bannerUrl });
  } catch {
    return NextResponse.json({ bannerUrl: null });
  }
}
