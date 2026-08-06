import { unstable_cache } from "next/cache";

const API = "https://graphql.anilist.co";
const QUERY = `query ($title: String) { Media(search: $title, type: MANGA, isAdult: false) { bannerImage } }`;

async function resolveBanner(title: string): Promise<string | null> {
  if (!title?.trim()) return null;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Hana/1.0" },
      body: JSON.stringify({ query: QUERY, variables: { title } }),
      signal: AbortSignal.timeout(6_000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { Media?: { bannerImage?: string | null } | null } | null;
      };
      return json?.data?.Media?.bannerImage ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export const bannerForTitle = unstable_cache(resolveBanner, ["anilist-banner"], {
  revalidate: 24 * 60 * 60,
});
