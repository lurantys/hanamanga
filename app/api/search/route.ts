import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchCatalog, searchCatalogByAuthor } from "@/lib/catalog";
import { searchAniListStaff } from "@/lib/anilist";

export const dynamic = "force-dynamic";

const POOL = 60;
const PAGE_LIMIT = 24;

const cachedSearch = unstable_cache(
  async (query: string) => (await searchCatalog(query, POOL)).data,
  ["api-search"],
  { revalidate: 300 },
);

// Author matching relies on AniList staff search; when AniList is down this
// rejects and the author section is simply omitted from the response.
const cachedStaffSearch = unstable_cache(
  async (query: string) => searchAniListStaff(query, 2),
  ["api-search-staff"],
  { revalidate: 300 },
);

const cachedAuthorSearch = unstable_cache(
  async (author: string) => {
    const result = await searchCatalogByAuthor(author, POOL);
    return { data: result.data, authorName: result.authorName ?? null };
  },
  ["api-search-author"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const author = sp.get("author")?.trim() ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  if (!q && !author) return NextResponse.json({ data: [], total: 0 });
  try {
    if (author) {
      const pool = await cachedAuthorSearch(author);
      const start = (page - 1) * PAGE_LIMIT;
      const data = pool.data.slice(start, start + PAGE_LIMIT);
      return NextResponse.json(
        { data, total: pool.data.length, page, authorName: pool.authorName },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          },
        },
      );
    }
    const [pool, staff] = await Promise.all([
      cachedSearch(q),
      cachedStaffSearch(q).catch(() => []),
    ]);
    const start = (page - 1) * PAGE_LIMIT;
    const data = pool.slice(start, start + PAGE_LIMIT);
    return NextResponse.json(
      { data, total: pool.length, page, authors: staff },
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
