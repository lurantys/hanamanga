export type ExternalLinkKey = "al" | "mal" | "kt" | "ap" | "mu";

export type ExternalLink = {
  key: ExternalLinkKey;
  label: string;
  href: string;
};

const BUILDERS: Record<
  ExternalLinkKey,
  { label: string; build: (value: string) => string }
> = {
  al: {
    label: "AniList",
    build: (value) => `https://anilist.co/manga/${value}`,
  },
  mal: {
    label: "MyAnimeList",
    build: (value) => `https://myanimelist.net/manga/${value}`,
  },
  kt: {
    label: "Kitsu",
    build: (value) => `https://kitsu.app/manga/${value}`,
  },
  ap: {
    label: "Anime-Planet",
    build: (value) => `https://www.anime-planet.com/manga/${value}`,
  },
  mu: {
    label: "MangaUpdates",
    build: (value) =>
      /^\d+$/.test(value)
        ? `https://www.mangaupdates.com/series.html?id=${value}`
        : `https://www.mangaupdates.com/series.html?search=${encodeURIComponent(value)}`,
  },
};

export function externalLinks(
  links?: Record<string, string> | null,
): ExternalLink[] {
  if (!links) return [];
  const result: ExternalLink[] = [];
  for (const key of Object.keys(BUILDERS) as ExternalLinkKey[]) {
    const value = links[key];
    if (!value) continue;
    result.push({ key, label: BUILDERS[key].label, href: BUILDERS[key].build(value) });
  }
  return result;
}