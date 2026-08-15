-- Two-way provider sync (AniList / MyAnimeList)
-- Run in Supabase SQL editor (or via CLI: supabase db push)

-- Per-library-row sync state for each connected provider.
-- Shape: { "anilist": { status?, progress?, syncedAt? }, "mal": { ... } }
-- A provider key present (without an error flag) means the row is synced with
-- that provider and pull treats the provider list as the source of truth.
-- An error flag marks rows that the provider refused to add (retry on pull).
alter table public.hana_library
  add column if not exists provider_state jsonb not null default '{}'::jsonb;

-- Last successful sync per provider (used by the account page).
alter table public.hana_oauth
  add column if not exists synced_at timestamptz;
