-- Aligne le rôle des propriétaires de cabinet sur `admin`.
-- Pour les cabinets créés avant l'introduction de cette règle, le créateur
-- était inséré avec `role = 'avocat'`. On rebascule ces lignes en `admin`
-- afin que les vérifications côté code (isCabinetAdmin) soient cohérentes
-- pour tous les comptes existants.
-- Idempotent : ne touche pas les lignes déjà à `admin`.

update public.users u
set role = 'admin'
from public.cabinets c
where c.owner_id = u.id
  and u.role <> 'admin';
