-- ═══════════════════════════════════════════════════════════════════
-- Module Comptes rendus (Adili) — DDL + RLS
--
-- Tables : comptes_rendus, comptes_rendus_versions
-- Alter  : commentaires.compte_rendu_id, audit_log.compte_rendu_id
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. ENUM statut CR ─────────────────────────────────────────────
do $$ begin
  create type public.statut_compte_rendu as enum (
    'brouillon', 'finalise', 'en_revue', 'valide', 'rejete'
  );
exception when duplicate_object then null; end $$;

-- ─── 2. COMPTES_RENDUS ─────────────────────────────────────────────
create table if not exists public.comptes_rendus (
  id uuid primary key default gen_random_uuid(),
  affaire_id uuid not null references public.affaires(id) on delete cascade,
  type_cr text not null,
  titre text not null,
  date_evenement timestamptz not null,
  duree_minutes integer,
  lieu text,
  participants jsonb not null default '[]'::jsonb,
  corps_tiptap jsonb not null,
  corps_text text,
  decisions_actions jsonb not null default '[]'::jsonb,
  pieces_remises jsonb not null default '[]'::jsonb,
  statut public.statut_compte_rendu not null default 'brouillon',
  soumis_validation boolean not null default false,
  confidentialite public.confidentialite not null default 'standard',
  genere_ia boolean not null default false,
  ia_tokens_utilises integer,
  auteur_id uuid not null references public.users(id),
  validateur_id uuid references public.users(id) on delete set null,
  valide_at timestamptz,
  verrou_user_id uuid references public.users(id) on delete set null,
  verrou_acquis_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comptes_rendus_affaire_date_idx
  on public.comptes_rendus (affaire_id, date_evenement desc);
create index if not exists comptes_rendus_auteur_created_idx
  on public.comptes_rendus (auteur_id, created_at desc);
create index if not exists comptes_rendus_affaire_statut_idx
  on public.comptes_rendus (affaire_id, statut);
create index if not exists comptes_rendus_verrou_idx
  on public.comptes_rendus (verrou_user_id);

create index if not exists comptes_rendus_corps_text_fts_idx
  on public.comptes_rendus
  using gin (to_tsvector('french', coalesce(titre, '') || ' ' || coalesce(corps_text, '')));

-- ─── 3. COMPTES_RENDUS_VERSIONS ────────────────────────────────────
create table if not exists public.comptes_rendus_versions (
  id uuid primary key default gen_random_uuid(),
  compte_rendu_id uuid not null references public.comptes_rendus(id) on delete cascade,
  corps_tiptap jsonb not null,
  corps_text text,
  formulaire_snapshot jsonb,
  version_num integer not null,
  trigger text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists comptes_rendus_versions_uniq
  on public.comptes_rendus_versions (compte_rendu_id, version_num);
create index if not exists comptes_rendus_versions_cr_idx
  on public.comptes_rendus_versions (compte_rendu_id, created_at desc);

-- ─── 4. COMMENTAIRES — scope CR ────────────────────────────────────
alter table public.commentaires
  alter column document_id drop not null;

alter table public.commentaires
  add column if not exists compte_rendu_id uuid
  references public.comptes_rendus(id) on delete cascade;

create index if not exists commentaires_compte_rendu_idx
  on public.commentaires (compte_rendu_id, created_at);

do $$ begin
  alter table public.commentaires
    add constraint commentaires_parent_scope_chk
    check (
      (document_id is not null and compte_rendu_id is null)
      or (document_id is null and compte_rendu_id is not null)
    );
exception when duplicate_object then null; end $$;

-- ─── 5. AUDIT_LOG — scope CR ───────────────────────────────────────
alter table public.audit_log
  add column if not exists compte_rendu_id uuid
  references public.comptes_rendus(id) on delete cascade;

create index if not exists audit_log_compte_rendu_created_idx
  on public.audit_log (compte_rendu_id, created_at desc);

-- ─── 6. Helpers RLS ────────────────────────────────────────────────
create or replace function public.is_cabinet_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    left join public.cabinets c on c.id = u.cabinet_id
    where u.id = auth.uid()
      and u.cabinet_id = public.current_cabinet_id()
      and (u.role = 'admin' or c.owner_id = auth.uid())
  );
$$;

revoke all on function public.is_cabinet_admin() from public;
grant execute on function public.is_cabinet_admin() to authenticated, anon;

create or replace function public.can_access_compte_rendu(p_compte_rendu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.comptes_rendus cr
    join public.affaires a on a.id = cr.affaire_id
    where cr.id = p_compte_rendu_id
      and public.can_access_affaire(cr.affaire_id)
      and (
        cr.confidentialite = 'standard'
        or cr.auteur_id = auth.uid()
        or a.responsable_id = auth.uid()
        or public.is_cabinet_admin()
      )
  );
$$;

revoke all on function public.can_access_compte_rendu(uuid) from public;
grant execute on function public.can_access_compte_rendu(uuid) to authenticated, anon;

-- ─── 7. RLS comptes_rendus ─────────────────────────────────────────
alter table public.comptes_rendus enable row level security;

drop policy if exists "comptes_rendus_select" on public.comptes_rendus;
create policy "comptes_rendus_select" on public.comptes_rendus
  for select to authenticated
  using (public.can_access_affaire(affaire_id));

drop policy if exists "comptes_rendus_write" on public.comptes_rendus;
create policy "comptes_rendus_write" on public.comptes_rendus
  for all to authenticated
  using (public.can_access_compte_rendu(id))
  with check (public.can_access_affaire(affaire_id));

-- ─── 8. RLS comptes_rendus_versions ────────────────────────────────
alter table public.comptes_rendus_versions enable row level security;

drop policy if exists "comptes_rendus_versions_access" on public.comptes_rendus_versions;
create policy "comptes_rendus_versions_access" on public.comptes_rendus_versions
  for all to authenticated
  using (public.can_access_compte_rendu(compte_rendu_id))
  with check (public.can_access_compte_rendu(compte_rendu_id));

-- ─── 9. RLS commentaires (documents + CR) ────────────────────────
drop policy if exists "commentaires_access" on public.commentaires;
create policy "commentaires_access" on public.commentaires
  for all to authenticated
  using (
    (document_id is not null and exists (
      select 1 from public.documents d
      where d.id = commentaires.document_id
        and public.can_access_affaire(d.affaire_id)
    ))
    or (compte_rendu_id is not null and public.can_access_compte_rendu(compte_rendu_id))
  )
  with check (
    (document_id is not null and exists (
      select 1 from public.documents d
      where d.id = commentaires.document_id
        and public.can_access_affaire(d.affaire_id)
    ))
    or (compte_rendu_id is not null and public.can_access_compte_rendu(compte_rendu_id))
  );

-- ─── 10. RLS audit_log (lecture CR liée) ───────────────────────────
drop policy if exists "audit_log_select_accessible" on public.audit_log;
create policy "audit_log_select_accessible" on public.audit_log
  for select to authenticated
  using (
    cabinet_id = public.current_cabinet_id()
    and (
      affaire_id is null
      or public.can_access_affaire(affaire_id)
    )
    and (
      compte_rendu_id is null
      or public.can_access_compte_rendu(compte_rendu_id)
    )
  );
