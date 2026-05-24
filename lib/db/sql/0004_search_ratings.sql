-- ═══════════════════════════════════════════════════════════════════
-- Adili — Notation des résultats de recherche (1..5)
--
-- Une ligne par (user, chunk, query) : la dernière note remplace les
-- précédentes via INSERT ... ON CONFLICT DO UPDATE.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.search_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  cabinet_id  uuid references public.cabinets(id) on delete set null,
  chunk_id    uuid not null references public.chunks(id) on delete cascade,
  query       text not null,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists search_ratings_uniq
  on public.search_ratings(user_id, chunk_id, query);

create index if not exists search_ratings_chunk_idx
  on public.search_ratings(chunk_id);

create index if not exists search_ratings_query_idx
  on public.search_ratings(query);

create index if not exists search_ratings_created_idx
  on public.search_ratings(created_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────
-- Le rôle Postgres (Drizzle) bypass RLS. Ces policies sécurisent les
-- accès via supabase-js / PostgREST.
alter table public.search_ratings enable row level security;

drop policy if exists "search_ratings_select_self" on public.search_ratings;
create policy "search_ratings_select_self" on public.search_ratings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "search_ratings_insert_self" on public.search_ratings;
create policy "search_ratings_insert_self" on public.search_ratings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "search_ratings_update_self" on public.search_ratings;
create policy "search_ratings_update_self" on public.search_ratings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "search_ratings_delete_self" on public.search_ratings;
create policy "search_ratings_delete_self" on public.search_ratings
  for delete to authenticated
  using (user_id = auth.uid());
