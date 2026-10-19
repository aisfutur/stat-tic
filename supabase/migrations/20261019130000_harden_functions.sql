-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — durcissement des fonctions                              ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- Trois avertissements du linter Supabase sur le schéma initial :
--
-- 1. `search_path` modifiable sur les deux fonctions créées sans. Tout y
--    est déjà qualifié (`public.training_days`, `auth.uid()`), donc on fige
--    un chemin vide : plus aucun objet ne peut être résolu par surprise.
-- 2. `handle_new_user()` est `security definer` et, par défaut, exécutable
--    par tout le monde via `/rest/v1/rpc/`. C'est une fonction de trigger :
--    personne n'a à l'appeler directement. Les triggers continuent de la
--    déclencher, le privilège EXECUTE n'étant vérifié qu'à leur création.

alter function public.touch_updated_at() set search_path = '';
alter function public.current_streak() set search_path = '';

revoke execute on function public.handle_new_user() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.handle_new_user() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.handle_new_user() from authenticated;
  end if;
end;
$$;
