-- Personne responsable d'une échéance (membre de l'affaire, notifiée par email)
alter table public.echeances
  add column if not exists responsable_id uuid references public.users (id) on delete set null;

create index if not exists echeances_responsable_idx
  on public.echeances (responsable_id);
