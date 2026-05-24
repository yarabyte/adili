-- Synchronisation auth.users (Supabase) → public.users (schéma Drizzle).
-- Idempotent : peut être réappliqué sans casse.

-- 1) Fonction qui upsert dans public.users à partir d’un enregistrement auth.users.
create or replace function public.handle_auth_user_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_intended_plan text;
begin
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_intended_plan := nullif(
    trim(coalesce(new.raw_user_meta_data->>'intended_plan', '')),
    ''
  );

  delete from public.users u
  where lower(u.email) = lower(new.email)
    and u.id <> new.id;

  insert into public.users (id, email, full_name, intended_plan, role)
  values (
    new.id,
    new.email,
    v_full_name,
    v_intended_plan,
    'avocat'::public.role
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name),
      intended_plan = coalesce(excluded.intended_plan, public.users.intended_plan);

  return new;
end;
$$;

-- 2) Triggers : à la création et à la mise à jour de l’email / des métadonnées.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_upsert();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_upsert();

-- 3) Backfill des utilisateurs déjà présents dans auth.users.
insert into public.users (id, email, full_name)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;
