-- Hana sync schema
-- Run in Supabase SQL editor (or via CLI: supabase db push)

-- Library entries (manga the user has added to their list)
create table if not exists public.hana_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  manga jsonb not null,
  added_at bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

-- Reading progress (chapter position per manga)
create table if not exists public.hana_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  chapter_id text not null,
  chapter_label text not null,
  manga_title text not null,
  cover_url text,
  scroll_fraction double precision not null default 0,
  manga_fraction double precision,
  updated_at bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

-- Read chapters (per manga, per chapter, timestamp)
create table if not exists public.hana_read_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  chapter_id text not null,
  read_at bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id, chapter_id)
);

-- Reader settings (per user)
create table if not exists public.hana_reader_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb not null,
  updated_at bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Scanlator preferences (per manga)
create table if not exists public.hana_scanlator_preference (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  scanlator_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

-- OAuth tokens for integrations (AniList, MyAnimeList, etc.)
create table if not exists public.hana_oauth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- Row Level Security
alter table public.hana_library enable row level security;
alter table public.hana_progress enable row level security;
alter table public.hana_read_state enable row level security;
alter table public.hana_reader_settings enable row level security;
alter table public.hana_scanlator_preference enable row level security;
alter table public.hana_oauth enable row level security;

create policy "users read own library" on public.hana_library
  for select using (auth.uid() = user_id);
create policy "users write own library" on public.hana_library
  for insert with check (auth.uid() = user_id);
create policy "users update own library" on public.hana_library
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own library" on public.hana_library
  for delete using (auth.uid() = user_id);

create policy "users read own progress" on public.hana_progress
  for select using (auth.uid() = user_id);
create policy "users write own progress" on public.hana_progress
  for insert with check (auth.uid() = user_id);
create policy "users update own progress" on public.hana_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own progress" on public.hana_progress
  for delete using (auth.uid() = user_id);

create policy "users read own read state" on public.hana_read_state
  for select using (auth.uid() = user_id);
create policy "users write own read state" on public.hana_read_state
  for insert with check (auth.uid() = user_id);
create policy "users update own read state" on public.hana_read_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own read state" on public.hana_read_state
  for delete using (auth.uid() = user_id);

create policy "users read own settings" on public.hana_reader_settings
  for select using (auth.uid() = user_id);
create policy "users write own settings" on public.hana_reader_settings
  for insert with check (auth.uid() = user_id);
create policy "users update own settings" on public.hana_reader_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own settings" on public.hana_reader_settings
  for delete using (auth.uid() = user_id);

create policy "users read own scanlator prefs" on public.hana_scanlator_preference
  for select using (auth.uid() = user_id);
create policy "users write own scanlator prefs" on public.hana_scanlator_preference
  for insert with check (auth.uid() = user_id);
create policy "users update own scanlator prefs" on public.hana_scanlator_preference
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own scanlator prefs" on public.hana_scanlator_preference
  for delete using (auth.uid() = user_id);

create policy "users read own oauth" on public.hana_oauth
  for select using (auth.uid() = user_id);
create policy "users write own oauth" on public.hana_oauth
  for insert with check (auth.uid() = user_id);
create policy "users update own oauth" on public.hana_oauth
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own oauth" on public.hana_oauth
  for delete using (auth.uid() = user_id);

-- Realtime: enable postgres_changes events so the browser pulls live sync updates.
do $$
declare
  _table text;
begin
  foreach _table in array array[
    'public.hana_library',
    'public.hana_progress',
    'public.hana_read_state',
    'public.hana_reader_settings',
    'public.hana_scanlator_preference'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = split_part(_table, '.', 2)
    ) then
      execute format('alter publication supabase_realtime add table %s', _table);
    end if;
  end loop;
end $$;
