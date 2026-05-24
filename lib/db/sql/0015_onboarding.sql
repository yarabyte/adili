-- Onboarding multi-plans : étudiants sans cabinet, essai 30j, écoles, leads grand cabinet

-- Écoles reconnues (liste admin)
create table if not exists public.ecoles_etudiant (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ville text,
  actif boolean not null default true,
  ordre_affichage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ecoles_etudiant_nom_uniq
  on public.ecoles_etudiant (lower(trim(nom)));

-- Demandes commerciales Grand Cabinet
create table if not exists public.leads_grand_cabinet (
  id uuid primary key default gen_random_uuid(),
  nom_cabinet text not null,
  ville text not null,
  nombre_avocats integer not null,
  telephone text not null,
  email text not null,
  message text not null,
  statut text not null default 'nouveau',
  traite_par uuid references auth.users(id) on delete set null,
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_grand_cabinet_statut on public.leads_grand_cabinet (statut, created_at desc);

-- Plan choisi à l'inscription (copie metadata)
alter table public.users
  add column if not exists intended_plan text;

-- Abonnements : cabinet OU utilisateur (étudiant)
alter table public.subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.subscriptions
  alter column cabinet_id drop not null;

alter table public.subscriptions
  add column if not exists est_essai boolean not null default false;

alter table public.subscriptions
  add column if not exists date_fin_essai timestamptz;

-- Quotas IA sans cabinet (étudiants)
alter table public.quotas_ia
  alter column cabinet_id drop not null;

-- Lien école validée
alter table public.validations_etudiants
  add column if not exists ecole_id uuid references public.ecoles_etudiant(id) on delete set null;

-- RLS écoles : lecture publique des actives
alter table public.ecoles_etudiant enable row level security;

drop policy if exists ecoles_select_active on public.ecoles_etudiant;
create policy ecoles_select_active on public.ecoles_etudiant
  for select to authenticated
  using (actif = true);

-- Écoles de démarrage (à compléter dans /admin/ecoles)
insert into public.ecoles_etudiant (nom, ville, ordre_affichage) values
  ('Université de Yaoundé II — Soa', 'Yaoundé', 1),
  ('Université de Douala', 'Douala', 2),
  ('Université de Dschang', 'Dschang', 3),
  ('Université de Buea', 'Buea', 4),
  ('Université de Maroua', 'Maroua', 5)
;

-- Leads : pas d'accès client direct (API serveur + admin service role)
alter table public.leads_grand_cabinet enable row level security;
