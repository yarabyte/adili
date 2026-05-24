-- ═══════════════════════════════════════════════════════════════════
-- document_citations — table pivot pour les références au corpus juridique
-- insérées dans les documents rédigés (module Affaires §5).
--
-- Idempotent. Peut être ré-appliqué sans casse.
--
-- Contrat JSON côté TipTap (cf. extensions à créer au point 5) :
--
--   * Mark `citation`         → mode = 'inline'
--   * Node `citationBlock`    → mode = 'block'
--
-- Reconstituée à chaque sauvegarde par `lib/documents/citations.ts`.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Enum citation_mode ────────────────────────────────────────────
do $$ begin
  create type public.citation_mode as enum ('inline', 'block');
exception when duplicate_object then null; end $$;

-- ─── Table ─────────────────────────────────────────────────────────
create table if not exists public.document_citations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  -- SET NULL : si un chunk disparaît (ré-indexation), la citation reste
  -- "orpheline" mais lisible grâce aux snapshots ci-dessous.
  chunk_id uuid references public.chunks(id) on delete set null,
  source_short_code text,
  article_number text,
  article_label text not null,
  mode public.citation_mode not null,
  position integer,
  created_at timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────────────────
-- Dédoublonnage par (document, chunk, mode). Les citations orphelines
-- (chunk_id IS NULL) ne sont pas contraintes : Postgres considère les
-- NULLs comme distincts dans un index UNIQUE.
create unique index if not exists document_citations_uniq
  on public.document_citations (document_id, chunk_id, mode);
create index if not exists document_citations_document_idx
  on public.document_citations (document_id);
create index if not exists document_citations_chunk_idx
  on public.document_citations (chunk_id);

-- ─── RLS ───────────────────────────────────────────────────────────
-- Hérite de l'accès au document parent via can_access_affaire(affaire_id).
alter table public.document_citations enable row level security;

drop policy if exists "document_citations_access" on public.document_citations;
create policy "document_citations_access" on public.document_citations
  for all to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_citations.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_citations.document_id
        and public.can_access_affaire(d.affaire_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- Fin de migration 0008_document_citations.sql
-- ═══════════════════════════════════════════════════════════════════
