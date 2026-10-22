-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — mode mono-propriétaire, sans compte                     ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- L'app n'a qu'un seul utilisateur : son auteur. Le détour par un compte
-- Supabase (`auth.users` + `auth.uid()`) ne servait qu'à prouver à la base
-- que les lignes étaient les siennes. On le remplace par un propriétaire
-- unique codé en dur, partagé par l'app et par la base.
--
-- Ce que ça change :
--
--   1. Les clés étrangères `user_id -> auth.users` disparaissent : les
--      lignes n'appartiennent plus à un compte, mais au propriétaire fixe.
--   2. La RLS ne compare plus à `auth.uid()` mais à ce propriétaire. Elle
--      reste active, et garde son autre rôle : rendre le catalogue intégré
--      (`user_id is null`) non modifiable par l'API.
--   3. Le rôle `anon` — celui de la clé publiable — obtient l'accès en
--      écriture, puisqu'il n'y a plus de connexion.
--
-- ⚠ Conséquence à assumer : la clé publiable est embarquée dans le bundle
--   de l'app déployée. Quiconque la récupère peut lire et modifier ce
--   journal d'entraînement. C'est le prix du « pas de compte ». Pour
--   refermer : redonner les politiques à `auth.uid()` et réactiver l'écran
--   de connexion (`git revert` de cette migration + du commit applicatif).

-- Le propriétaire unique. Doit rester identique à `OWNER_ID` dans
-- `src/data/constants.ts` : c'est la seule valeur qui lie l'app à ses lignes.
create or replace function public.owner_id()
returns uuid
language sql
immutable
set search_path = ''
as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;

-- ─── 1. Détacher les données de `auth.users` ───────────────────────

alter table public.profiles drop constraint if exists profiles_id_fkey;

do $$
declare
  t text;
begin
  foreach t in array array[
    'progression_paths', 'exercises', 'progression_steps',
    'user_progress', 'progression_unlocks',
    'routines', 'routine_exercises',
    'sessions', 'session_exercises', 'sets'
  ]
  loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    -- Valeur par défaut : une insertion écrite à la main en SQL appartient
    -- au propriétaire sans avoir à répéter l'uuid.
    execute format('alter table public.%I alter column user_id set default public.owner_id()', t);
  end loop;
end;
$$;

alter table public.profiles alter column id set default public.owner_id();

-- Plus de comptes : le trigger qui créait un profil à l'inscription n'a
-- plus d'objet, et une inscription accidentelle ne doit pas semer de lignes.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Le profil du propriétaire, que l'app lit au démarrage. La routine active
-- est pré-remplie pour que l'accueil propose une séance dès le premier
-- lancement, comme le fait le mode `localStorage`.
insert into public.profiles (id, active_routine_id)
values (public.owner_id(), 'rt-fb-3')
on conflict (id) do nothing;

-- ─── 2. Rejouer la RLS sur le propriétaire fixe ────────────────────

drop policy if exists "profil visible par son propriétaire"   on public.profiles;
drop policy if exists "profil modifiable par son propriétaire" on public.profiles;
drop policy if exists "profil créable par son propriétaire"    on public.profiles;

create policy "profil du propriétaire"
  on public.profiles for all
  using (id = public.owner_id())
  with check (id = public.owner_id());

do $$
declare
  t text;
begin
  -- Catalogue : lecture du contenu intégré + du propriétaire, écriture sur
  -- le sien seulement. `user_id is null` reste intouchable via l'API.
  foreach t in array array[
    'progression_paths', 'exercises', 'progression_steps',
    'routines', 'routine_exercises'
  ]
  loop
    execute format('drop policy if exists "lecture catalogue et perso" on public.%I', t);
    execute format('drop policy if exists "insertion perso" on public.%I', t);
    execute format('drop policy if exists "modification perso" on public.%I', t);
    execute format('drop policy if exists "suppression perso" on public.%I', t);

    execute format(
      'create policy "lecture catalogue et perso" on public.%I
         for select using (user_id is null or user_id = public.owner_id())', t);
    execute format(
      'create policy "insertion perso" on public.%I
         for insert with check (user_id = public.owner_id())', t);
    execute format(
      'create policy "modification perso" on public.%I
         for update using (user_id = public.owner_id())
         with check (user_id = public.owner_id())', t);
    execute format(
      'create policy "suppression perso" on public.%I
         for delete using (user_id = public.owner_id())', t);
  end loop;

  -- Données d'entraînement : accès complet au propriétaire, rien d'autre.
  foreach t in array array[
    'user_progress', 'progression_unlocks',
    'sessions', 'session_exercises', 'sets'
  ]
  loop
    execute format('drop policy if exists "accès propriétaire" on public.%I', t);
    execute format(
      'create policy "accès propriétaire" on public.%I
         for all using (user_id = public.owner_id())
         with check (user_id = public.owner_id())', t);
  end loop;
end;
$$;

-- ─── 3. Ouvrir les tables au rôle de la clé publiable ──────────────

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon;
    grant select, insert, update, delete on all tables in schema public to anon;
    grant select on public.exercise_daily_bests, public.training_days,
      public.volume_by_category to anon;
    grant execute on function public.current_streak() to anon;
    grant execute on function public.owner_id() to anon;
  end if;
  -- `authenticated` garde ses droits : si l'app repasse un jour par un
  -- compte, seules les politiques sont à rejouer.
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.owner_id() to authenticated;
  end if;
end;
$$;

-- ─── 4. Le streak SQL ne dépend plus de la session ─────────────────

create or replace function public.current_streak()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select distinct date from public.training_days where user_id = public.owner_id()
  ),
  anchored as (
    select date from days
    where date <= current_date
      and (select max(date) from days) >= current_date - 1
  ),
  grouped as (
    -- Des jours consécutifs partagent la même valeur de (date - rang).
    select date, date - (row_number() over (order by date desc) * interval '-1 day') as grp
    from anchored
  )
  select coalesce(count(*)::integer, 0)
  from grouped
  where grp = (select grp from grouped order by date desc limit 1);
$$;
