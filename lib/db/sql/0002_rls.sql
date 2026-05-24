-- ═══════════════════════════════════════════════════════════════════
-- RLS Adili — Idempotent. Réappliquer sans risque.
--
-- Note :
--   Le rôle Postgres utilisé par DATABASE_URL (souvent « postgres ») a
--   BYPASSRLS, donc nos server actions (Drizzle) continuent à fonctionner
--   normalement. Ces policies protègent l’API PostgREST (clé anon) et
--   tout accès via supabase-js depuis le navigateur.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper : cabinet courant de l’utilisateur authentifié ────────
create or replace function public.current_cabinet_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cabinet_id from public.users where id = auth.uid();
$$;

revoke all on function public.current_cabinet_id() from public;
grant execute on function public.current_cabinet_id() to authenticated, anon;

-- ─── cabinets ─────────────────────────────────────────────────────
alter table public.cabinets enable row level security;

drop policy if exists "cabinets_select_members" on public.cabinets;
create policy "cabinets_select_members" on public.cabinets
  for select to authenticated
  using (id = public.current_cabinet_id());

drop policy if exists "cabinets_update_owner" on public.cabinets;
create policy "cabinets_update_owner" on public.cabinets
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ─── users ────────────────────────────────────────────────────────
alter table public.users enable row level security;

drop policy if exists "users_select_self_or_cabinet" on public.users;
create policy "users_select_self_or_cabinet" on public.users
  for select to authenticated
  using (id = auth.uid() or cabinet_id = public.current_cabinet_id());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── invitations ──────────────────────────────────────────────────
-- Lecture limitée au cabinet ; écritures via server actions (Drizzle/postgres).
alter table public.invitations enable row level security;

drop policy if exists "invitations_select_cabinet" on public.invitations;
create policy "invitations_select_cabinet" on public.invitations
  for select to authenticated
  using (cabinet_id = public.current_cabinet_id());

-- ─── sources / chunks (corpus juridique) ──────────────────────────
-- Lecture libre pour tout utilisateur authentifié. Ingestion via Drizzle.
alter table public.sources enable row level security;

drop policy if exists "sources_select_authenticated" on public.sources;
create policy "sources_select_authenticated" on public.sources
  for select to authenticated
  using (true);

alter table public.chunks enable row level security;

drop policy if exists "chunks_select_authenticated" on public.chunks;
create policy "chunks_select_authenticated" on public.chunks
  for select to authenticated
  using (true);

-- ─── documents ────────────────────────────────────────────────────
alter table public.documents enable row level security;

drop policy if exists "documents_cabinet_all" on public.documents;
create policy "documents_cabinet_all" on public.documents
  for all to authenticated
  using (cabinet_id = public.current_cabinet_id())
  with check (cabinet_id = public.current_cabinet_id());

-- ─── templates ────────────────────────────────────────────────────
-- Lecture : templates système (cabinet_id null) ou cabinet courant.
-- Écriture : uniquement sur les templates du cabinet courant.
alter table public.templates enable row level security;

drop policy if exists "templates_select_system_or_cabinet" on public.templates;
create policy "templates_select_system_or_cabinet" on public.templates
  for select to authenticated
  using (cabinet_id is null or cabinet_id = public.current_cabinet_id());

drop policy if exists "templates_modify_cabinet" on public.templates;
create policy "templates_modify_cabinet" on public.templates
  for all to authenticated
  using (cabinet_id = public.current_cabinet_id())
  with check (cabinet_id = public.current_cabinet_id());

-- ─── searches ─────────────────────────────────────────────────────
alter table public.searches enable row level security;

drop policy if exists "searches_select_self" on public.searches;
create policy "searches_select_self" on public.searches
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "searches_insert_self" on public.searches;
create policy "searches_insert_self" on public.searches
  for insert to authenticated
  with check (user_id = auth.uid());
