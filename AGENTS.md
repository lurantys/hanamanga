<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hana — codebase map

Manga reader web app: discover, read, and track manga/manhwa/manhua/webtoons. **Hana** (repo: `lurantys/hanamanga`), live at **hanamanga.online** on Vercel. This file gives you everything needed to work here without re-deriving it.

## Stack

- **Next.js 16.3.0** (App Router) + **React 19.2.8** + **TypeScript** 5 (strict, `@/*` → repo root)
- **Tailwind CSS v4** (`@tailwindcss/postcss`, `app/globals.css`)
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for auth + library/progress storage
- Minimal deps — no UI kit, no state lib, no data-fetching lib. Everything is hand-rolled.

## Commands

- `npm run dev` — dev server (also re-writes the Next.js agent-rules block in this file)
- `npm run build` — production build (must pass before pushing; ~1 min)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
- After any change: run `tsc`, `eslint`, and `build` before pushing. Changes deploy automatically from `main` via Vercel.

## Architecture

Manga content is **never hosted here** — it aggregates third-party providers server-side and streams their images in-app.

### Data providers (in `lib/`)

- `lib/mangadex.ts` — primary source. MangaDex API: list, details, chapters, pages, aggregation, follows order.
- `lib/atsu.ts` — Atsumaru: catalog, details, chapters/pages, AVIF posters.
- `lib/mangakatana.ts`, `lib/weebcentral.ts` — secondary sources.
- `lib/catalog.ts` — provider orchestrator. Tries MangaDex → Atsu → MangaKatana with fallback; merges genres, ratings, descriptions.
- `lib/reader-data.ts` — shared reader types + chapter/page resolution (used by both the reader page and `/api/preload-chapter`).
- `lib/anilist.ts` — AniList GraphQL search, top-popular for sitemap.
- `lib/read.ts` — home feed rows (`cachedTrending`, `cachedPopular`, `cachedTopRated`), revalidated ~300s.

### App routes (`app/`)

- `(main)/page.tsx` — home: HeroSpotlight, ContinueRow, RecommendedRow, NewChaptersRow, Carousels
- `(main)/manga/[id]/page.tsx` — detail page: MangaChapterList, ExpandableDescription, LibraryButton
- `(main)/browse/page.tsx` — BrowseGrid + BrowseFilters
- `(main)/search/page.tsx` — SearchLiveResults + SearchResults
- `(main)/library/page.tsx` — LibraryRow (requires auth)
- `(main)/account/page.tsx`, `login/page.tsx` — auth UI
- `read/[mangaId]/page.tsx` (redirects) and `read/[mangaId]/[chapterId]/page.tsx` — **the Reader** (see below)
- API routes: `/api/banner`, `/api/browse`, `/api/feed`, `/api/manga`, `/api/recommend`, `/api/search`, `/api/preload-chapter`, `/api/integrations/{avatar,mal,mal/callback,mal/status,anilist,anilist/callback,anilist/status,sync}`, `/auth/callback`
- `sitemap.ts`, `robots.ts`, `manifest.json`, `opengraph-image.tsx` + `twitter-image.tsx` (ImageResponse OG cards)

### Auth & data (Supabase)

- `lib/auth.tsx` — SSR AuthProvider + `useAuth` hook
- `lib/supabase/server.ts`, `lib/supabase/client.ts`
- `lib/userManga.ts` — library entries (reading/read/planning/dropped); `lib/library.ts` — list helpers
- `lib/progress.ts`, `lib/read-state.ts` — per-chapter progress + read state (localStorage, per-device)
- `lib/reader-settings.ts` — reader prefs (mode/scale/fit/gap) in localStorage
- `lib/sync.ts`, `lib/provider-sync.ts` — AniList/MAL list sync (title matching via `lib/title.ts`)
- `lib/integrations.ts` — AniList + MAL OAuth (PKCE; MAL uses *plain* code challenge)
- Migrations in `supabase/migrations/`: `0001_init.sql` (tables incl. `hana_reader_settings`, `hana_scanlator_preference`, `hana_oauth`, RLS), `0002_provider_sync.sql`
- `.env.example` lists all env vars: `NEXT_PUBLIC_SITE_URL`, Supabase URL+key, AniList/MAL OAuth client id/secret.

## The Reader (`components/Reader.tsx`, ~1665 lines)

The most important and most fragile component. Reads chapters in-app from any provider.

- **Modes**: `webtoon` (vertical scroll; `displayProgress` derives from scroll position) and `paged` (per-page; supports two-page spread `isTwoPage`).
- **State-heavy**: reader settings, progress, current/next chapter, preload URLs, zoom/fit, bottom sheets, keyboard nav.
- **Image preloading** (`lib/reader-data.ts` + `/api/preload-chapter`): when near end of chapter (webtoon >85%, paged near last pages), fetches the *next* chapter's page URLs and emits `<link rel="preload">`.
- **Performance history — DO NOT REGRESS**:
  - `router.prefetch(nextHref)` fires on every `displayProgress` change → previously spammed the same URL ~200ms apart during scroll. Fixed with ref guards (`prefetchedNextRef` / `prefetchedNextNextRef`) so each URL prefetches at most once per chapter.
  - `/api/preload-chapter` fetch fired on every scroll tick past 85% (the `cancelled` cleanup flag only ignores the response, not the request). Fixed with `preloadedChapterRef` (commit `41dce14`).
  - Same root cause class: an effect keyed on `displayProgress`/scroll that issues network requests per scroll event. **Never key an effect that fetches/prefetches on `displayProgress`; use refs to dedupe.**
- `<Link>` prefetch is IntersectionObserver-based and deduped (once per link per viewport entry) — not the source of storms.

## Conventions

- Server components fetch data; client components (marked `"use client"`) handle interactivity. Minimal client boundary.
- API routes do provider fallback server-side; never expose source internals to the client beyond what `reader-data.ts` types define.
- Add `prefetch={false}` to any `<Link>` that appears in a list/carousel/dropdown (bulk reader links already have it: MangaChapterList, AtsuChapterList, Reader dropdown, ContinueRow, library grid/list).
- Styling: Tailwind v4 utility classes; Geist + Zen_Kaku_Gothic_New fonts in root layout. Apple-style, restrained, motion-forward design. No emojis in code or UI.

## Gotchas

- **Next.js 16 has breaking API changes** vs. your training data — read `node_modules/next/dist/docs/` before writing code (e.g. `params` is a Promise in pages, metadata/ImageResponse conventions).
- The `nextjs-agent-rules` block above is auto-re-added by `next dev`; keep it in your diffs.
- Images: `unoptimized: true` with remote patterns for `uploads.mangadex.org`, `cdn.atsu.moe`, `*.anilist.co`, `cdn.myanimelist.net`.
- `.env.local` holds real secrets — never commit or log them.
- Legal: reader only, no content hosted. License is proprietary/unlicensed.