-- Index pour accélérer les requêtes fréquentes (sidebar, dashboard).
-- Idempotent : npm run db:perf-indexes

create index if not exists audit_log_user_action_created_idx
  on public.audit_log (user_id, action, created_at desc)
  where affaire_id is not null;

create index if not exists validations_etudiants_user_created_idx
  on public.validations_etudiants (user_id, created_at desc);

create index if not exists subscriptions_cabinet_statut_idx
  on public.subscriptions (cabinet_id, statut, created_at desc)
  where cabinet_id is not null;
