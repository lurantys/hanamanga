import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DESKTOP_STANDALONE === "1"
    ? { output: "standalone" as const }
    : {}),
  images: {
    // Vercel Image Optimization is unavailable on the current deployment plan.
    // Serve approved remote images directly so uncached media still renders.
    unoptimized: true,
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "cdn.atsu.moe" },
      { protocol: "https", hostname: "*.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
    ],
  },
};

export default nextConfig;
