/**
 * Crawler detection. Edge-runtime safe (pure regex, no Node APIs) so it can
 * run in `proxy.ts` before any rendering or upstream fetching happens.
 *
 * Why: crawlers (notably Meta's, which ignores robots.txt for shared links)
 * hit `/read/*` chapter URLs directly. A full reader render fans out to
 * several upstream providers and costs seconds + hundreds of MB per hit,
 * while the crawler only ever reads `<head>` metadata.
 */

/**
 * Well-known crawlers / link-preview fetchers. Kept explicit (rather than a
 * bare `bot` substring) to avoid false-positiving real browsers. Matching is
 * case-insensitive and substring-based.
 */
const BOT_TOKENS = [
  // Social / link previews (the bulk of our crawler traffic)
  "meta-externalagent",
  "facebookexternalhit",
  "facebookcatalog",
  "twitterbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "linkedinbot",
  "whatsapp",
  "iframely",
  // Search engines (chapter URLs are disallowed in robots.txt anyway —
  // the series page is the canonical indexable URL)
  "googlebot",
  "mediapartners-google",
  "adsbot-google",
  "bingbot",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "petalbot",
];

const BOT_PATTERN = new RegExp(BOT_TOKENS.join("|"), "i");

/** True when the User-Agent belongs to a known crawler/preview fetcher. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}
