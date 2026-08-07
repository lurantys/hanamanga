import { unstable_cache } from "next/cache";

const API = "https://graphql.anilist.co";
const ID_QUERY = `query ($id: Int) { Media(id: $id, type: MANGA, isAdult: false) { bannerImage } }`;
const TITLE_QUERY = `query ($title: String) { Media(search: $title, type: MANGA, isAdult: false) { bannerImage } }`;

async function queryAnilist(
  query: string,
  variables: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Hana/1.0" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { bannerImage?: string | null } | null } | null;
    };
    return json?.data?.Media?.bannerImage ?? null;
  } catch {
    return null;
  }
}

export type BannerSource = {
  title: string;
  anilistId?: string | null;
};

async function resolveBanner({ title, anilistId }: BannerSource): Promise<string | null> {
  if (anilistId) {
    const parsed = Number(anilistId);
    if (Number.isFinite(parsed) && parsed > 0) {
      const banner = await queryAnilist(ID_QUERY, { id: parsed });
      if (banner) return banner;
    }
  }
  if (!title?.trim()) return null;
  return queryAnilist(TITLE_QUERY, { title: title.trim() });
}

export const bannerForManga = unstable_cache(resolveBanner, ["anilist-banner"], {
  revalidate: 24 * 60 * 60,
});
