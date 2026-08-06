import { NextResponse } from "next/server";
import { bannerForTitle } from "@/lib/banner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  if (!title) return NextResponse.json({ bannerUrl: null });
  try {
    const bannerUrl = await bannerForTitle(title);
    return NextResponse.json({ bannerUrl });
  } catch {
    return NextResponse.json({ bannerUrl: null });
  }
}
