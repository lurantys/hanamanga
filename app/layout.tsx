import type { Metadata, Viewport } from "next";
import { Geist, Zen_Kaku_Gothic_New } from "next/font/google";
import { WipProvider } from "@/components/WipProvider";
import { AuthProvider } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const siteUrl = SITE_URL;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hana — A modern web manga reader | Hanamanga",
  description:
    "Hana by Hanamanga is a modern manga, manhwa, manhua, and webtoon reader. Read manga online at hanamanga.online, beautifully on any device.",
  applicationName: "Hana",
  appleWebApp: {
    capable: true,
    title: "Hana",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Hana — Hanamanga",
    title: "Hana — A modern web manga reader | Hanamanga",
    description:
      "Hana by Hanamanga is a modern manga, manhwa, manhua, and webtoon reader. Read manga online at hanamanga.online.",
    images: [
      {
        url: "/logo-v2.png",
        width: 500,
        height: 500,
        alt: "Hana — Hanamanga manga reader",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hana — A modern web manga reader | Hanamanga",
    description:
      "Hana by Hanamanga is a modern manga, manhwa, manhua, and webtoon reader. Read manga online at hanamanga.online.",
    images: ["/logo-v2.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Hana",
      alternateName: "Hanamanga",
      description:
        "A modern web manga reader for manga, manhwa, manhua, and webtoons.",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Hana",
      alternateName: "Hanamanga",
      url: siteUrl,
      logo: `${siteUrl}/logo-v2.png`,
      sameAs: [
        "https://github.com/lurantys/hanamanga",
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
        <AuthProvider>
          <WipProvider>{children}</WipProvider>
        </AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </body>
    </html>
  );
}
