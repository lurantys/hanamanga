import type { MetadataRoute } from "next";
import { fetchAniListList } from "@/lib/anilist";
import { fetchMangaList } from "@/lib/mangadex";
import { SITE_URL } from "@/lib/site";

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
];

const TOP_MANGA_PAGES = 5;
const PER_PAGE = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mangaRoutes: MetadataRoute.Sitemap = [];
  try {
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
  } catch {
    // fall back to the static routes only
  }
  return [...STATIC_ROUTES, ...mangaRoutes];
}
