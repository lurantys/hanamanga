-- A single local reading status for each saved manga.
alter table public.hana_library
  add column if not exists library_status text not null default 'to_read'
  check (library_status in ('to_read', 'reading', 'read'));

-- Preserve the status users already implied through progress and finished rows.
update public.hana_library as library
set library_status = case
  when lower(coalesce(library.provider_state #>> '{anilist,status}', '')) = 'completed'
    or lower(coalesce(library.provider_state #>> '{mal,status}', '')) = 'completed' then 'read'
  when lower(coalesce(library.provider_state #>> '{anilist,status}', '')) in ('current', 'reading')
    or lower(coalesce(library.provider_state #>> '{mal,status}', '')) = 'reading' then 'reading'
  when exists (
    select 1 from public.hana_progress as progress
    where progress.user_id = library.user_id and progress.manga_id = library.manga_id
  ) then 'reading'
  else 'to_read'
end;
