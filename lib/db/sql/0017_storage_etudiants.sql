-- Bucket privé pour justificatifs étudiants (upload via service role).
-- Idempotent. Appliquer : npm run db:storage-etudiants

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'etudiants',
  'etudiants',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
