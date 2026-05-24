-- Facturation, abonnements, quotas IA, paiements (Adili)

-- ─── Plans (catalogue) ─────────────────────────────────────────────
create table if not exists public.plans (
  id text primary key,
  nom text not null,
  description text,
  prix_mensuel_fcfa integer not null default 0,
  prix_annuel_fcfa integer not null default 0,
  type_facturation text not null,
  max_users integer,
  quota_ia_par_user integer not null,
  stockage_go integer,
  modules_inclus jsonb not null default '[]'::jsonb,
  features jsonb default '{}'::jsonb,
  modes_paiement jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  ordre_affichage integer,
  created_at timestamptz not null default now()
);

insert into public.plans (
  id, nom, description, prix_mensuel_fcfa, prix_annuel_fcfa, type_facturation,
  max_users, quota_ia_par_user, stockage_go, modules_inclus, features, modes_paiement, ordre_affichage
) values
  (
    'etudiant', 'Étudiant',
    'Recherche et comptes rendus pour étudiants en droit (validation requise).',
    0, 0, 'gratuit', 1, 30, 1,
    '["recherche","cr"]'::jsonb, '{"watermark":true}'::jsonb, '[]'::jsonb, 1
  ),
  (
    'individuel', 'Individuel',
    'Avocat ou praticien en solo — recherche IA, dossiers, documents.',
    30000, 300000, 'forfait', 1, 150, 5,
    '["recherche","cr","affaires","documents"]'::jsonb, '{}'::jsonb, '["mobile_money"]'::jsonb, 2
  ),
  (
    'cabinet', 'Cabinet',
    'Cabinet jusqu''à 7 utilisateurs — collaboration et volume accru.',
    100000, 1000000, 'forfait', 7, 250, 50,
    '["recherche","cr","affaires","documents"]'::jsonb, '{"collaboration":true}'::jsonb, '["virement"]'::jsonb, 3
  ),
  (
    'grand_cabinet', 'Grand Cabinet',
    'Grands cabinets — tarif négocié, utilisateurs et quotas sur mesure.',
    0, 0, 'degressif', null, 400, null,
    '["recherche","cr","affaires","documents"]'::jsonb, '{"sso":true,"api":true,"sla":true}'::jsonb, '["virement"]'::jsonb, 4
  )
on conflict (id) do update set
  nom = excluded.nom,
  description = excluded.description,
  prix_mensuel_fcfa = excluded.prix_mensuel_fcfa,
  prix_annuel_fcfa = excluded.prix_annuel_fcfa,
  quota_ia_par_user = excluded.quota_ia_par_user,
  modules_inclus = excluded.modules_inclus,
  modes_paiement = excluded.modes_paiement,
  ordre_affichage = excluded.ordre_affichage;

-- ─── Subscriptions ───────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  plan_id text not null references public.plans(id),
  statut text not null,
  cycle text not null,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  date_renouvellement timestamptz,
  auto_renouvellement boolean not null default true,
  est_beta boolean not null default false,
  date_fin_beta timestamptz,
  prix_negocie_fcfa integer,
  nb_users_negocies integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_cabinet_actif
  on public.subscriptions (cabinet_id)
  where statut in ('actif', 'beta_gratuit', 'en_attente_paiement');

-- Cabinets existants : bêta 12 mois (plan Individuel)
insert into public.subscriptions (
  cabinet_id, plan_id, statut, cycle, date_debut, date_fin, est_beta, date_fin_beta
)
select
  c.id,
  'individuel',
  'beta_gratuit',
  'mensuel',
  now(),
  now() + interval '12 months',
  true,
  now() + interval '12 months'
from public.cabinets c
where not exists (
  select 1 from public.subscriptions s
  where s.cabinet_id = c.id
    and s.statut in ('actif', 'beta_gratuit', 'en_attente_paiement')
);

-- ─── Quotas IA (par user / mois) ─────────────────────────────────
create table if not exists public.quotas_ia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  periode_debut date not null,
  periode_fin date not null,
  quota_mensuel integer not null,
  consomme integer not null default 0,
  depassement_gratuit_utilise boolean not null default false,
  packs_actifs jsonb not null default '[]'::jsonb,
  alerte_80_envoyee boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, periode_debut)
);

create index if not exists idx_quotas_ia_user_periode
  on public.quotas_ia (user_id, periode_debut desc);

-- ─── Packs additionnels ──────────────────────────────────────────
create table if not exists public.packs_additionnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cabinet_id uuid references public.cabinets(id) on delete set null,
  type_pack text not null default 'requetes_ia_100',
  prix_fcfa integer not null default 5000,
  quantite integer not null default 100,
  consomme integer not null default 0,
  date_achat timestamptz not null default now(),
  date_expiration timestamptz not null,
  paiement_id uuid,
  statut text not null default 'actif'
);

create index if not exists idx_packs_user_actifs
  on public.packs_additionnels (user_id)
  where statut = 'actif';

-- ─── Paiements ───────────────────────────────────────────────────
create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references public.cabinets(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  pack_id uuid references public.packs_additionnels(id) on delete set null,
  montant_fcfa integer not null,
  monnaie text not null default 'XAF',
  methode text not null,
  statut text not null,
  cinetpay_transaction_id text,
  cinetpay_payment_token text,
  cinetpay_payment_url text,
  reference_virement text,
  facture_proforma_url text,
  preuve_virement_url text,
  date_virement_constate date,
  valide_par uuid references auth.users(id) on delete set null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_paiements_cabinet on public.paiements (cabinet_id, created_at desc);
create index if not exists idx_paiements_en_attente on public.paiements (statut) where statut = 'en_attente';

alter table public.packs_additionnels
  drop constraint if exists packs_additionnels_paiement_id_fkey;
alter table public.packs_additionnels
  add constraint packs_additionnels_paiement_id_fkey
  foreign key (paiement_id) references public.paiements(id) on delete set null;

-- ─── Factures ────────────────────────────────────────────────────
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  type text not null,
  cabinet_id uuid references public.cabinets(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  paiement_id uuid references public.paiements(id) on delete set null,
  montant_ht_fcfa integer not null,
  tva_pourcent numeric(5,2) default 0,
  montant_ttc_fcfa integer not null,
  periode_debut date,
  periode_fin date,
  lignes jsonb not null default '[]'::jsonb,
  pdf_url text,
  date_emission date default current_date,
  date_echeance date,
  date_paiement date,
  created_at timestamptz not null default now()
);

-- ─── Validations étudiants ───────────────────────────────────────
create table if not exists public.validations_etudiants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ecole text not null,
  numero_etudiant text,
  email_institutionnel text,
  justificatif_url text,
  statut text not null default 'en_attente',
  validee_par uuid references auth.users(id) on delete set null,
  motif_rejet text,
  expire_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Admin LexAI / Adili ─────────────────────────────────────────
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  permissions jsonb not null default '[]'::jsonb,
  cree_par uuid references auth.users(id) on delete set null,
  actif boolean not null default true,
  derniere_connexion timestamptz,
  derniere_action timestamptz,
  ip_derniere_connexion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_users_actif on public.admin_users (user_id) where actif = true;

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete restrict,
  action text not null,
  cible_type text not null,
  cible_id uuid not null,
  etat_avant jsonb,
  etat_apres jsonb,
  motif text not null,
  ip_address text,
  user_agent text,
  impact_financier_fcfa integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_actions_admin_date on public.admin_actions (admin_user_id, created_at desc);

-- ─── Extension ai_calls (ledger existant) ────────────────────────
alter table public.ai_calls add column if not exists feature text;
alter table public.ai_calls add column if not exists model text;
alter table public.ai_calls add column if not exists cost_fcfa_estime numeric(10,2);
alter table public.ai_calls add column if not exists quota_via text;
alter table public.ai_calls add column if not exists pack_id uuid references public.packs_additionnels(id) on delete set null;
alter table public.ai_calls add column if not exists depassement_gratuit boolean not null default false;

update public.ai_calls set feature = action where feature is null and action is not null;

-- ─── RLS ─────────────────────────────────────────────────────────
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.quotas_ia enable row level security;
alter table public.packs_additionnels enable row level security;
alter table public.paiements enable row level security;
alter table public.factures enable row level security;
alter table public.validations_etudiants enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_actions enable row level security;

drop policy if exists plans_select_authenticated on public.plans;
create policy plans_select_authenticated on public.plans
  for select to authenticated using (is_active = true);

drop policy if exists subscriptions_select_cabinet on public.subscriptions;
create policy subscriptions_select_cabinet on public.subscriptions
  for select to authenticated
  using (
    cabinet_id in (
      select cabinet_id from public.users where id = auth.uid() and cabinet_id is not null
    )
  );

drop policy if exists quotas_ia_select_own on public.quotas_ia;
create policy quotas_ia_select_own on public.quotas_ia
  for select to authenticated using (user_id = auth.uid());

drop policy if exists packs_select_own on public.packs_additionnels;
create policy packs_select_own on public.packs_additionnels
  for select to authenticated using (user_id = auth.uid());

drop policy if exists paiements_select_cabinet on public.paiements;
create policy paiements_select_cabinet on public.paiements
  for select to authenticated
  using (
    user_id = auth.uid()
    or cabinet_id in (select cabinet_id from public.users where id = auth.uid())
  );

drop policy if exists factures_select_cabinet on public.factures;
create policy factures_select_cabinet on public.factures
  for select to authenticated
  using (
    cabinet_id in (select cabinet_id from public.users where id = auth.uid())
  );

drop policy if exists validations_etudiants_select_own on public.validations_etudiants;
create policy validations_etudiants_select_own on public.validations_etudiants
  for select to authenticated using (user_id = auth.uid());

drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = auth.uid() and actif = true);
