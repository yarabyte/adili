-- Ajout d'un téléphone optionnel au profil utilisateur.
-- Idempotent : peut être réappliqué sans casse.

alter table public.users
  add column if not exists phone text;
