const API = "https://graphql.anilist.co";
const QUERY = `query ($title: String) { Media(search: $title, type: MANGA, isAdult: false) { bannerImage } }`;
const CACHE_TTL = 24 * 60 * 60 * 1000;

const cacheStore = new Map<string, { expires: number; value: string | null }>();

export async function bannerForTitle(title: string): Promise<string | null> {
  if (!title?.trim()) return null;
  const cached = cacheStore.get(title);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value: string | null = null;
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
      value = json?.data?.Media?.bannerImage ?? null;
    }
  } catch {
    value = null;
  }

  cacheStore.set(title, { expires: Date.now() + CACHE_TTL, value });
  return value;
}
