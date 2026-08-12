import { NextResponse } from "next/server";
import { fetchMangaList, getTagId } from "@/lib/mangadex";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tags = (searchParams.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const exclude = new Set(
    (searchParams.get("exclude") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const limit = Math.min(Number(searchParams.get("limit")) || 18, 40);

  if (!tags.length) return NextResponse.json({ data: [] });

  const ids = (
    await Promise.all(tags.map((name) => getTagId(name)))
  ).filter((id): id is string => Boolean(id));
  if (!ids.length) return NextResponse.json({ data: [] });

  try {
    const { data } = await fetchMangaList({
      includedTags: ids,
      order: { followedCount: "desc" },
      limit: limit + exclude.size + 12,
    });
    const filtered = data.filter((manga) => !exclude.has(manga.id)).slice(0, limit);
    return NextResponse.json(
      { data: filtered },
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
