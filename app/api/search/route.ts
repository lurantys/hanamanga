import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchSearch } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

const cachedSearch = unstable_cache(
  async (query: string) => (await fetchSearch(query, 12)).data,
  ["api-search"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ data: [] });
  try {
    const data = await cachedSearch(q);
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json({ data: [], error: "unavailable" }, { status: 502 });
  }
}
