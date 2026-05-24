-- Titre professionnel affiché (Avocat, Juriste, Huissier…) + préfixe Maître en UI
alter table public.users
  add column if not exists titre text;

comment on column public.users.titre is 'Titre professionnel : avocat, huissier, juriste, notaire, etc.';
