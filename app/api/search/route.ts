import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const POOL = 60;
const PAGE_LIMIT = 24;

const cachedSearch = unstable_cache(
  async (query: string) => (await searchCatalog(query, POOL)).data,
  ["api-search"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  if (!q) return NextResponse.json({ data: [], total: 0 });
  try {
    const pool = await cachedSearch(q);
    const start = (page - 1) * PAGE_LIMIT;
    const data = pool.slice(start, start + PAGE_LIMIT);
    return NextResponse.json(
      { data, total: pool.length, page },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { data: [], total: 0, error: "unavailable" },
      { status: 502 },
    );
  }
}
