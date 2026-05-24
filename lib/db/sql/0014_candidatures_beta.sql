-- Programme avocats pionniers (beta)

create table if not exists public.candidatures_beta (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  telephone text,
  barreau text,
  annees_experience integer,
  type_pratique text,
  dossiers_actifs integer,
  motivation text not null,
  statut text not null default 'en_revue',
  user_id_cree uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_candidatures_beta_statut
  on public.candidatures_beta (statut, created_at desc);

create unique index if not exists idx_candidatures_beta_email_pending
  on public.candidatures_beta (lower(email))
  where statut in ('en_revue', 'liste_attente');

alter table public.candidatures_beta enable row level security;

-- Pas de policy insert public : insertion via service role / API serveur uniquement
