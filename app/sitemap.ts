import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList } from "@/lib/mangadex";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${SITE_URL}/browse`,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/about`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

const TOP_MANGA_PAGES = 5;
const PER_PAGE = 100;

const cachedMangaRoutes = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const mangaRoutes: MetadataRoute.Sitemap = [];
    for (let page = 0; page < TOP_MANGA_PAGES; page++) {
      let data;
      try {
        data = (
          await fetchAniListList({
            limit: PER_PAGE,
            offset: page * PER_PAGE,
            sort: "popular",
          })
        ).data;
      } catch {
        data = (
          await fetchMangaList({
            limit: PER_PAGE,
            offset: page * PER_PAGE,
            order: { followedCount: "desc" },
          })
        ).data;
      }
      for (const manga of data) {
        mangaRoutes.push({
          url: `${SITE_URL}/manga/${manga.id}`,
          lastModified: manga.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (data.length < PER_PAGE) break;
    }
    return mangaRoutes;
  },
  ["sitemap-manga-routes"],
  { revalidate: 3600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let mangaRoutes: MetadataRoute.Sitemap = [];
  try {
    mangaRoutes = await cachedMangaRoutes();
  } catch {
    // fall back to the static routes only
  }
  return [...STATIC_ROUTES, ...mangaRoutes];
}
