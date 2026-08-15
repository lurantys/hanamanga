import type { Metadata } from "next";
import { Geist, Geist_Mono, Zen_Kaku_Gothic_New } from "next/font/google";
import { WipProvider } from "@/components/WipProvider";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hana — Discover Manga",
  description:
    "Hana is a Netflix-style manga catalog and reader — browse and search thousands of titles from MangaDex, build a library, and pick up right where you left off.",
  applicationName: "Hana",
  keywords: ["manga", "reader", "mangadex", "anime", "comics"],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Hana",
    images: [
      {
        url: "/logo-v2.png",
        width: 500,
        height: 500,
        alt: "Hana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/logo-v2.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
        <WipProvider>{children}</WipProvider>
      </body>
    </html>
  );
}
