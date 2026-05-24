-- Profil cabinet : logo, coordonnées, immatriculation (Cameroun / OHADA)
alter table public.cabinets
  add column if not exists logo_url text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists registre_commerce text,
  add column if not exists niu text;

comment on column public.cabinets.logo_url is 'URL publique du logo (bucket Supabase cabinet-logos)';
comment on column public.cabinets.address is 'Adresse postale du cabinet';
comment on column public.cabinets.phone is 'Téléphone principal du cabinet';
comment on column public.cabinets.registre_commerce is 'Numéro au registre du commerce';
comment on column public.cabinets.niu is 'Numéro d''identification unique (fiscal)';

-- Bucket public pour les logos (upload via service role côté serveur)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cabinet-logos',
  'cabinet-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
