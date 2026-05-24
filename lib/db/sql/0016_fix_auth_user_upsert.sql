-- Corrige le trigger auth → public.users (erreur « Database error saving new user »).
-- Idempotent. Appliquer : npm run db:sql -- lib/db/sql/0016_fix_auth_user_upsert.sql

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

  -- Profil orphelin (même email, autre id) — évite users_email_unique
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_upsert();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_upsert();
