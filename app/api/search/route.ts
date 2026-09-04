import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  fetchCachedAuthorCatalog,
  fetchCachedSearchCatalog,
} from "@/lib/catalog";
import { searchAniListStaff } from "@/lib/anilist";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 24;

// Author matching relies on AniList staff search; when AniList is down this
// rejects and the author section is simply omitted from the response.
const cachedStaffSearch = unstable_cache(
  async (query: string) => searchAniListStaff(query, 2),
  ["api-search-staff"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const author = sp.get("author")?.trim() ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  if (q.length > 200 || author.length > 200) {
    return NextResponse.json(
      { data: [], total: 0 },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  }
  if (!q && !author) {
    return NextResponse.json(
      { data: [], total: 0 },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  }
  try {
    if (author) {
      const pool = await fetchCachedAuthorCatalog(author);
      const start = (page - 1) * PAGE_LIMIT;
      const data = pool.data.slice(start, start + PAGE_LIMIT);
      return NextResponse.json(
        { data, total: pool.data.length, page, authorName: pool.authorName, authorImageUrl: pool.authorImageUrl },
        {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    }
    const [pool, staff] = await Promise.all([
      fetchCachedSearchCatalog(q),
      cachedStaffSearch(q).catch(() => []),
    ]);
    const start = (page - 1) * PAGE_LIMIT;
    const data = pool.data.slice(start, start + PAGE_LIMIT);
    return NextResponse.json(
      { data, total: pool.data.length, page, authors: staff },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
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
