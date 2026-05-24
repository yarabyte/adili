-- ai_calls — registre des appels IA (synthèse RAG, etc.)
-- Sert à la fois de ledger de rate-limit (par user / heure) et de log léger.

create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cabinet_id uuid references public.cabinets(id) on delete set null,
  action text not null,                                          -- ex. 'synthesize'
  query text,
  status text not null default 'pending',                        -- pending | ok | error | rate_limited
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  meta jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_calls_user_action_created_idx
  on public.ai_calls (user_id, action, created_at desc);

create index if not exists ai_calls_created_idx
  on public.ai_calls (created_at desc);

-- RLS : lecture par l’utilisateur propriétaire uniquement, écriture interdite côté navigateur.
-- Le serveur Next utilise la connexion `postgres` (DATABASE_URL) qui contourne RLS.
alter table public.ai_calls enable row level security;

drop policy if exists ai_calls_select_own on public.ai_calls;
create policy ai_calls_select_own on public.ai_calls
  for select
  using (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE pour les rôles authenticated / anon → aucun accès en écriture.
