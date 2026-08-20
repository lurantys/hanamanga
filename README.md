<div align="center">

<a href="https://hanamanga.online/">
    <img src="./public/logo-v2.png" alt="Hana logo" title="Hana logo" width="80"/>
</a>

# Hana

### A modern web manga reader

Discover, read, and track manga, manhwa, manhua, and webtoons — beautifully, on any device.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Live](https://img.shields.io/badge/Live-hanamanga.online-0877d2?logo=vercel&logoColor=white)](https://hanamanga.online/)
[![Last commit](https://img.shields.io/github/last-commit/lurantys/hanamanga)](https://github.com/lurantys/hanamanga)

</div>

## Features

<div align="left">

* **Discover & browse** — trending, popular, and genre carousels, plus instant search and filtered browsing.
* **Personalized home feed** — *Recommended for You* and *New Chapters* built from your library and reading history.
* **Built-in reader** — smooth paged and webtoon modes with zoom, fit, and immersive controls.
* **Library & Continue Reading** — pick up right where you left off; your progress stays on your device.
* **Rich detail pages** — chapters, ratings, genres, and related titles.
* **Source-aware** — aggregates MangaDex, Atsu, and MangaKatana and reads chapters in-app with automatic source fallback.
* **Track & sync** — connect AniList or MyAnimeList to keep your reading lists in sync.
* **Fast & responsive** — server-rendered with Next.js, tuned for desktop and mobile.

</div>

## Tech Stack

* [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
* [Tailwind CSS](https://tailwindcss.com) for styling
* [Supabase](https://supabase.com) for authentication and library storage
* Live on [Vercel](https://hanamanga.online/)

## Try it live

Hana is deployed and running at **[hanamanga.online](https://hanamanga.online/)** — no setup required.

## Desktop App (Experimental)

A native **Windows** desktop build of Hana — the same reader, packaged with a built-in server so it runs offline and standalone.

> ⚠️ **EXPERIMENTAL · BETA · Full of bugs**
>
> This is a bleeding-edge preview. Expect rough edges, unpolished flows, and the occasional crash. The desktop app is provided as-is and may change or break without notice. The web version at hanamanga.online remains the stable experience.

**[⬇ Download Hana Desktop for Windows (x64) — BETA](https://github.com/lurantys/hanamanga/releases)**

* Single-file installer — no Node.js, no setup, no extra tools.
* Launches straight into the home page with a hidden local server.
* Email/password login works out of the box. Google, AniList, and MAL sign-in require adding `http://127.0.0.1:<port>` as a redirect URL in those services.
* Rebuilt from the same codebase as the web app; from source via `npm run desktop:build` (needs Rust + MSVC build tools).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Legal Notice

Hana is a reader app only — it does not host, store, or distribute any manga. All titles, chapters, and images are sourced directly from third-party providers at the moment you open them, and all rights remain with their creators and publishers.

© 2026 Hana. All rights reserved.

## License

This project is currently **unlicensed / proprietary**. All rights reserved. You may view the source, but reuse, redistribution, or modification is not permitted without explicit permission from the author.