-- ═══════════════════════════════════════════════════════════════════
-- Module Affaires (Adili) — DDL + RLS
--
-- Idempotent (peut être ré-appliqué sans casse). Inclut le clean-up des
-- tables placeholders historiques (`documents` + `templates` + enum
-- `doc_type`) qui ne sont référencées nulle part dans l'app et qui
-- entrent en collision avec la nouvelle table `documents` du module.
--
-- Tables créées :
--   clients, affaires, affaire_membres,
--   documents, document_versions, commentaires,
--   echeances, audit_log
--
-- RLS : isolation par cabinet, avec règle spécifique pour le flag
--       confidentialite='sensible' (membre explicite requis).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 0. CLEAN-UP : placeholders historiques ────────────────────────
-- Les tables `documents` et `templates` créées au tout début du projet
-- étaient des squelettes inutilisés (ni servies, ni écrites par l'app).
-- On les supprime AVANT de créer les nouvelles tables homonymes.
drop table if exists public.templates cascade;
drop table if exists public.documents cascade;
drop type  if exists public.doc_type;

-- ─── 1. ENUMS ──────────────────────────────────────────────────────
do $$ begin
  create type public.type_contentieux as enum (
    'commercial', 'societes', 'suretes', 'recouvrement',
    'procedures_collectives', 'arbitrage', 'penal_affaires',
    'social', 'fiscal', 'bail_commercial', 'transport',
    'propriete_intellectuelle', 'autre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_client as enum ('personne_physique', 'personne_morale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.confidentialite as enum ('standard', 'sensible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.statut_affaire as enum (
    'ouvert', 'en_cours', 'en_delibere', 'clos', 'archive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.statut_document as enum (
    'brouillon', 'en_revue', 'valide', 'rejete', 'archive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.role_affaire as enum ('responsable', 'contributeur', 'lecteur');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_echeance as enum (
    'audience', 'depot', 'signification', 'delai_appel', 'autre'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.statut_echeance as enum ('a_venir', 'passee', 'annulee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trigger_version as enum (
    'soumission', 'validation', 'rejet', 'manuel'
  );
exception when duplicate_object then null; end $$;

-- ─── 2. CLIENTS ────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  nom text not null,
  type public.type_client,
  contact jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_cabinet_idx on public.clients (cabinet_id);
create index if not exists clients_nom_idx     on public.clients (cabinet_id, nom);

-- ─── 3. AFFAIRES ───────────────────────────────────────────────────
create table if not exists public.affaires (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  reference text not null,
  intitule text not null,
  type_contentieux public.type_contentieux not null,
  juridiction text,
  client_id uuid not null references public.clients(id) on delete restrict,
  adversaires jsonb not null default '[]'::jsonb,
  date_ouverture date not null default now(),
  statut public.statut_affaire not null default 'ouvert',
  confidentialite public.confidentialite not null default 'standard',
  responsable_id uuid not null references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists affaires_cabinet_reference_uniq
  on public.affaires (cabinet_id, reference);
create index if not exists affaires_cabinet_idx         on public.affaires (cabinet_id);
create index if not exists affaires_cabinet_statut_idx  on public.affaires (cabinet_id, statut);
create index if not exists affaires_client_idx          on public.affaires (client_id);
create index if not exists affaires_responsable_idx     on public.affaires (responsable_id);

-- ─── 4. AFFAIRE_MEMBRES ────────────────────────────────────────────
create table if not exists public.affaire_membres (
  id uuid primary key default gen_random_uuid(),
  affaire_id uuid not null references public.affaires(id) on delete cascade,
  user_id    uuid not null references public.users(id)    on delete cascade,
  role public.role_affaire not null,
  added_by uuid references public.users(id),
  added_at timestamptz not null default now()
);

create unique index if not exists affaire_membres_uniq
  on public.affaire_membres (affaire_id, user_id);
create index if not exists affaire_membres_affaire_idx on public.affaire_membres (affaire_id);
create index if not exists affaire_membres_user_idx    on public.affaire_membres (user_id);

-- ─── 5. DOCUMENTS ──────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  affaire_id uuid not null references public.affaires(id) on delete cascade,
  -- Clé snake_case du catalogue OHADA (lib/constants/types-documents.ts).
  type_document text not null,
  titre text not null,
  contenu_tiptap jsonb not null,
  contenu_text text,
  statut public.statut_document not null default 'brouillon',
  verrou_user_id uuid references public.users(id) on delete set null,
  verrou_acquis_at timestamptz,
  auteur_id uuid not null references public.users(id),
  validateur_id uuid references public.users(id) on delete set null,
  valide_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_affaire_idx         on public.documents (affaire_id);
create index if not exists documents_affaire_statut_idx  on public.documents (affaire_id, statut);
create index if not exists documents_verrou_idx          on public.documents (verrou_user_id);
create index if not exists documents_auteur_idx          on public.documents (auteur_id);

-- ─── 6. DOCUMENT_VERSIONS ──────────────────────────────────────────
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  contenu_tiptap jsonb not null,
  contenu_text text,
  version_num integer not null,
  trigger public.trigger_version not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists document_versions_uniq
  on public.document_versions (document_id, version_num);
create index if not exists document_versions_document_idx
  on public.document_versions (document_id, created_at);

-- ─── 7. COMMENTAIRES ───────────────────────────────────────────────
create table if not exists public.commentaires (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  auteur_id uuid not null references public.users(id),
  contenu text not null,
  ancre jsonb,
  parent_id uuid references public.commentaires(id) on delete cascade,
  resolu boolean not null default false,
  resolu_by uuid references public.users(id) on delete set null,
  resolu_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commentaires_document_idx
  on public.commentaires (document_id, created_at);
create index if not exists commentaires_parent_idx
  on public.commentaires (parent_id);
create index if not exists commentaires_document_resolu_idx
  on public.commentaires (document_id, resolu);

-- ─── 8. ECHEANCES ──────────────────────────────────────────────────
create table if not exists public.echeances (
  id uuid primary key default gen_random_uuid(),
  affaire_id uuid not null references public.affaires(id) on delete cascade,
  titre text not null,
  description text,
  date_echeance timestamptz not null,
  type public.type_echeance,
  alerte_j7 boolean not null default true,
  alerte_j2 boolean not null default true,
  alerte_j1 boolean not null default true,
  alertes_envoyees jsonb not null default '{}'::jsonb,
  statut public.statut_echeance not null default 'a_venir',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists echeances_affaire_idx
  on public.echeances (affaire_id, date_echeance);
create index if not exists echeances_statut_date_idx
  on public.echeances (statut, date_echeance);

-- ─── 9. AUDIT_LOG ──────────────────────────────────────────────────
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  affaire_id uuid references public.affaires(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_affaire_created_idx
  on public.audit_log (affaire_id, created_at desc);
create index if not exists audit_log_document_created_idx
  on public.audit_log (document_id, created_at desc);
create index if not exists audit_log_cabinet_created_idx
  on public.audit_log (cabinet_id, created_at desc);

-- ─── 10. SEARCHES.document_id → nouvelle table documents ───────────
-- L'ancienne FK a été supprimée en cascade lors du DROP de la table
-- documents historique. On la recrée vers la nouvelle table si nécessaire.
do $$ begin
  alter table public.searches
    add constraint searches_document_id_fkey
    foreign key (document_id)
    references public.documents(id)
    on delete set null;
exception
  when duplicate_object then null;
  when undefined_column then null;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════ RLS — Module Affaires ═════════════════════════
-- ═══════════════════════════════════════════════════════════════════
--
-- Modèle :
--   * Les server actions Drizzle utilisent un rôle Postgres BYPASSRLS →
--     elles ne sont pas impactées par ces policies (cf. 0002_rls.sql).
--   * Ces policies protègent l'API PostgREST (clé anon) et tout accès
--     direct via supabase-js depuis le navigateur.
--
-- Règle métier :
--   - Une affaire est accessible aux membres de son cabinet si elle est
--     en confidentialité 'standard'.
--   - Si confidentialite='sensible', seul un membre explicite de
--     affaire_membres y a accès.
--   - Les enfants (documents, versions, commentaires, échéances, audit)
--     héritent de l'accès via la fonction `can_access_affaire(uuid)`.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.can_access_affaire(p_affaire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.affaires a
    where a.id = p_affaire_id
      and a.cabinet_id = public.current_cabinet_id()
      and (
        a.confidentialite = 'standard'
        or exists (
          select 1 from public.affaire_membres m
          where m.affaire_id = a.id and m.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_access_affaire(uuid) from public;
grant execute on function public.can_access_affaire(uuid) to authenticated, anon;

-- ─── clients ───────────────────────────────────────────────────────
alter table public.clients enable row level security;

drop policy if exists "clients_cabinet_all" on public.clients;
create policy "clients_cabinet_all" on public.clients
  for all to authenticated
  using (cabinet_id = public.current_cabinet_id())
  with check (cabinet_id = public.current_cabinet_id());

-- ─── affaires ──────────────────────────────────────────────────────
alter table public.affaires enable row level security;

drop policy if exists "affaires_select_accessible" on public.affaires;
create policy "affaires_select_accessible" on public.affaires
  for select to authenticated
  using (
    cabinet_id = public.current_cabinet_id()
    and (
      confidentialite = 'standard'
      or exists (
        select 1 from public.affaire_membres m
        where m.affaire_id = affaires.id and m.user_id = auth.uid()
      )
    )
  );

drop policy if exists "affaires_modify_cabinet" on public.affaires;
create policy "affaires_modify_cabinet" on public.affaires
  for all to authenticated
  using (cabinet_id = public.current_cabinet_id())
  with check (cabinet_id = public.current_cabinet_id());

-- ─── affaire_membres ───────────────────────────────────────────────
alter table public.affaire_membres enable row level security;

drop policy if exists "affaire_membres_access" on public.affaire_membres;
create policy "affaire_membres_access" on public.affaire_membres
  for all to authenticated
  using (public.can_access_affaire(affaire_id))
  with check (public.can_access_affaire(affaire_id));

-- ─── documents ─────────────────────────────────────────────────────
alter table public.documents enable row level security;

drop policy if exists "documents_access" on public.documents;
create policy "documents_access" on public.documents
  for all to authenticated
  using (public.can_access_affaire(affaire_id))
  with check (public.can_access_affaire(affaire_id));

-- ─── document_versions ─────────────────────────────────────────────
alter table public.document_versions enable row level security;

drop policy if exists "document_versions_access" on public.document_versions;
create policy "document_versions_access" on public.document_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  );

-- ─── commentaires ──────────────────────────────────────────────────
alter table public.commentaires enable row level security;

drop policy if exists "commentaires_access" on public.commentaires;
create policy "commentaires_access" on public.commentaires
  for all to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = commentaires.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = commentaires.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  );

-- ─── echeances ─────────────────────────────────────────────────────
alter table public.echeances enable row level security;

drop policy if exists "echeances_access" on public.echeances;
create policy "echeances_access" on public.echeances
  for all to authenticated
  using (public.can_access_affaire(affaire_id))
  with check (public.can_access_affaire(affaire_id));

-- ─── audit_log ─────────────────────────────────────────────────────
-- Lecture : restreinte au cabinet courant + accès à l'affaire si liée.
-- Écriture : via server actions (BYPASSRLS) uniquement.
alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_accessible" on public.audit_log;
create policy "audit_log_select_accessible" on public.audit_log
  for select to authenticated
  using (
    cabinet_id = public.current_cabinet_id()
    and (
      affaire_id is null
      or public.can_access_affaire(affaire_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- Fin de migration 0007_module_affaires.sql
-- ═══════════════════════════════════════════════════════════════════
