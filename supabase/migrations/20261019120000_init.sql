-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — schéma initial                                          ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- Conventions de ce schéma :
--
-- 1. Clés primaires en `text`. Les données du catalogue gardent les
--    identifiants déjà utilisés par l'app ('ex-pullup', 'prog-pushup'…),
--    et les lignes créées par l'utilisateur reçoivent un uuid par défaut.
--    Un export JSON de la version localStorage s'importe donc tel quel.
--
-- 2. `user_id` est porté par TOUTES les tables, y compris les tables
--    enfants. Ce n'est pas de la redondance gratuite : les clés
--    étrangères composites (ci-dessous) garantissent au niveau base
--    qu'un enfant ne peut pas appartenir à un autre utilisateur que son
--    parent, et les politiques RLS deviennent de simples comparaisons
--    indexées plutôt que des sous-requêtes.
--
-- 3. Catalogue partagé : `user_id IS NULL` = donnée intégrée, visible
--    par tout le monde en lecture seule. `user_id = auth.uid()` = donnée
--    personnelle, modifiable par son propriétaire.

-- ─── Types ─────────────────────────────────────────────────────────

create type public.exercise_category as enum ('push', 'pull', 'legs', 'core', 'mobility');
create type public.measure_type as enum ('reps', 'time');

-- ─── Horodatage automatique ────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
--  Profil
-- ═══════════════════════════════════════════════════════════════════

create table public.profiles (
  id                         uuid primary key references auth.users (id) on delete cascade,
  display_name               text        not null default 'Athlète',
  -- Routine proposée sur l'accueil. FK posée plus bas (routines n'existe pas encore).
  active_routine_id          text,
  -- Exercice affiché par défaut dans la courbe des statistiques.
  favorite_chart_exercise_id text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Crée le profil automatiquement à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
--  Catalogue : progressions et exercices
-- ═══════════════════════════════════════════════════════════════════

create table public.progression_paths (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid references auth.users (id) on delete cascade,
  name       text not null,
  category   public.exercise_category not null,
  created_at timestamptz not null default now(),

  -- Cible des clés étrangères composites des tables enfants.
  unique (id, user_id)
);

create table public.exercises (
  id               text primary key default gen_random_uuid()::text,
  user_id          uuid references auth.users (id) on delete cascade,
  name             text not null,
  category         public.exercise_category not null,
  -- 'reps' → compteur de répétitions ; 'time' → maintien isométrique.
  type             public.measure_type not null,
  muscles          text[] not null default '{}',
  description      text   not null default '',
  common_mistakes  text[] not null default '{}',
  difficulty       smallint not null default 1 check (difficulty between 1 and 5),
  created_at       timestamptz not null default now()
);

create table public.progression_steps (
  id                text primary key default gen_random_uuid()::text,
  user_id           uuid references auth.users (id) on delete cascade,
  path_id           text not null,
  exercise_id       text not null,
  -- Rang du barreau dans l'échelle, 0 = le plus simple.
  position          smallint not null check (position >= 0),
  -- Critère de passage au barreau suivant.
  criterion_sets    smallint not null check (criterion_sets > 0),
  criterion_reps    smallint check (criterion_reps > 0),
  criterion_seconds smallint check (criterion_seconds > 0),
  criterion_label   text not null,

  -- Propriété : un barreau appartient toujours au même utilisateur que son échelle.
  foreign key (path_id, user_id)
    references public.progression_paths (id, user_id) on delete cascade,
  -- Référence au catalogue, et NON une relation de propriété : une échelle
  -- personnelle doit pouvoir pointer vers un exercice intégré (user_id null).
  -- Une FK composite l'interdirait, le couple (id, mon_uuid) n'existant pas.
  foreign key (exercise_id)
    references public.exercises (id) on delete cascade,

  unique (path_id, position),
  unique (path_id, exercise_id),
  -- Un critère chiffre soit des répétitions, soit un maintien, jamais les deux.
  constraint criterion_is_reps_xor_time
    check (num_nonnulls(criterion_reps, criterion_seconds) = 1)
);

-- ═══════════════════════════════════════════════════════════════════
--  Progression de l'utilisateur
-- ═══════════════════════════════════════════════════════════════════

create table public.user_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  path_id      text not null references public.progression_paths (id) on delete cascade,
  -- Index du barreau en cours de travail.
  current_step smallint not null default 0 check (current_step >= 0),
  updated_at   timestamptz not null default now(),

  primary key (user_id, path_id)
);

create trigger user_progress_touch
  before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- Date de validation de chaque barreau : une ligne plutôt qu'un objet JSON,
-- pour pouvoir interroger « qu'ai-je débloqué ce trimestre ? ».
create table public.progression_unlocks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  path_id     text not null references public.progression_paths (id) on delete cascade,
  step        smallint not null check (step >= 0),
  unlocked_on date not null default current_date,

  primary key (user_id, path_id, step)
);

-- ═══════════════════════════════════════════════════════════════════
--  Routines
-- ═══════════════════════════════════════════════════════════════════

create table public.routines (
  id                 text primary key default gen_random_uuid()::text,
  user_id            uuid references auth.users (id) on delete cascade,
  name               text not null,
  level              smallint not null default 1 check (level between 1 and 5),
  -- Famille de routines : « Full body », « Pousser », « Mes routines »…
  track              text not null,
  category           public.exercise_category not null,
  frequency_per_week smallint not null default 3 check (frequency_per_week between 1 and 7),
  estimated_minutes  smallint not null default 40 check (estimated_minutes > 0),
  -- Dérivé : une routine sans propriétaire est une routine intégrée.
  is_custom          boolean generated always as (user_id is not null) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (id, user_id)
);

create trigger routines_touch
  before update on public.routines
  for each row execute function public.touch_updated_at();

create table public.routine_exercises (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid references auth.users (id) on delete cascade,
  routine_id      text not null,
  exercise_id     text not null,
  position        smallint not null check (position >= 0),
  sets            smallint not null check (sets > 0),
  target_reps     smallint check (target_reps > 0),
  target_seconds  smallint check (target_seconds > 0),
  rest_seconds    smallint not null default 90 check (rest_seconds >= 0),
  tempo           text,
  -- Les exercices partageant cette clé s'enchaînent sans repos.
  superset_group  text,

  -- Propriété : une ligne appartient au même utilisateur que sa routine.
  foreign key (routine_id, user_id)
    references public.routines (id, user_id) on delete cascade,
  -- Référence au catalogue : une routine perso pointe vers des exercices
  -- intégrés (user_id null), donc FK simple sur l'id seul.
  foreign key (exercise_id)
    references public.exercises (id) on delete cascade,

  unique (routine_id, position),
  constraint target_is_reps_xor_time
    check (num_nonnulls(target_reps, target_seconds) = 1)
);

-- La routine active doit exister (FK posée maintenant que routines existe).
alter table public.profiles
  add constraint profiles_active_routine_fkey
  foreign key (active_routine_id) references public.routines (id) on delete set null;

alter table public.profiles
  add constraint profiles_favorite_exercise_fkey
  foreign key (favorite_chart_exercise_id) references public.exercises (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════
--  Séances loggées
-- ═══════════════════════════════════════════════════════════════════

create table public.sessions (
  id               text primary key default gen_random_uuid()::text,
  user_id          uuid not null references auth.users (id) on delete cascade,
  -- Jour de la séance en heure locale de l'athlète : une séance du soir
  -- ne doit pas basculer au lendemain comme le ferait un cast UTC.
  date             date not null default current_date,
  started_at       timestamptz not null default now(),
  -- NULL tant que la séance est en cours.
  ended_at         timestamptz,
  routine_id       text references public.routines (id) on delete set null,
  name             text not null,
  -- Calculée, jamais saisie : impossible qu'elle dérive des horodatages.
  duration_seconds integer generated always as (
    case when ended_at is null then null
         else greatest(0, extract(epoch from (ended_at - started_at))::integer)
    end
  ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint ended_after_started check (ended_at is null or ended_at >= started_at),
  unique (id, user_id)
);

create trigger sessions_touch
  before update on public.sessions
  for each row execute function public.touch_updated_at();

create table public.session_exercises (
  id             text primary key default gen_random_uuid()::text,
  user_id        uuid not null references auth.users (id) on delete cascade,
  session_id     text not null,
  exercise_id    text not null references public.exercises (id) on delete restrict,
  position       smallint not null check (position >= 0),
  notes          text,
  rest_seconds   smallint check (rest_seconds >= 0),
  superset_group text,

  foreign key (session_id, user_id)
    references public.sessions (id, user_id) on delete cascade,

  unique (session_id, position),
  unique (id, user_id)
);

create table public.sets (
  id                  text primary key default gen_random_uuid()::text,
  user_id             uuid not null references auth.users (id) on delete cascade,
  session_exercise_id text not null,
  position            smallint not null check (position >= 0),
  -- Lest en kg. 0 = poids du corps, négatif = assistance (élastique).
  weight              numeric(5, 2) not null default 0,
  reps                smallint check (reps >= 0),
  seconds             smallint check (seconds >= 0),
  tempo               text,
  completed           boolean not null default false,

  foreign key (session_exercise_id, user_id)
    references public.session_exercises (id, user_id) on delete cascade,

  unique (session_exercise_id, position),
  -- Une série mesure des répétitions OU un maintien, jamais les deux.
  constraint set_is_reps_xor_time
    check (num_nonnulls(reps, seconds) = 1)
);

-- ═══════════════════════════════════════════════════════════════════
--  Index
-- ═══════════════════════════════════════════════════════════════════

-- Historique et heatmap : toujours lus par utilisateur, du plus récent au plus ancien.
create index sessions_user_date_idx on public.sessions (user_id, date desc);
create index sessions_user_routine_idx on public.sessions (user_id, routine_id);

-- Remontée des séances vers leurs exercices et séries.
create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index sets_session_exercise_idx on public.sets (session_exercise_id, position);

-- Courbe d'évolution et records : « toutes mes séries sur cet exercice ».
create index session_exercises_user_exercise_idx
  on public.session_exercises (user_id, exercise_id);
-- Index partiel : les statistiques ne regardent que les séries validées.
create index sets_completed_idx on public.sets (user_id, session_exercise_id)
  where completed;

create index exercises_category_idx on public.exercises (category);
create index progression_steps_path_idx on public.progression_steps (path_id, position);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);
create index routines_track_level_idx on public.routines (track, level);

-- ═══════════════════════════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.progression_paths   enable row level security;
alter table public.exercises           enable row level security;
alter table public.progression_steps   enable row level security;
alter table public.user_progress       enable row level security;
alter table public.progression_unlocks enable row level security;
alter table public.routines            enable row level security;
alter table public.routine_exercises   enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_exercises   enable row level security;
alter table public.sets                enable row level security;

-- Profil : chacun ne voit que le sien.
create policy "profil visible par son propriétaire"
  on public.profiles for select using (auth.uid() = id);
create policy "profil modifiable par son propriétaire"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profil créable par son propriétaire"
  on public.profiles for insert with check (auth.uid() = id);

-- Catalogue : lecture du contenu intégré + du sien, écriture sur le sien seulement.
-- `user_id is null` = ligne intégrée, que personne ne peut modifier via l'API.
do $$
declare
  t text;
begin
  foreach t in array array[
    'progression_paths', 'exercises', 'progression_steps',
    'routines', 'routine_exercises'
  ]
  loop
    execute format(
      'create policy "lecture catalogue et perso" on public.%I
         for select using (user_id is null or auth.uid() = user_id)', t);
    execute format(
      'create policy "insertion perso" on public.%I
         for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "modification perso" on public.%I
         for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "suppression perso" on public.%I
         for delete using (auth.uid() = user_id)', t);
  end loop;
end;
$$;

-- Données personnelles : accès complet au propriétaire, rien aux autres.
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_progress', 'progression_unlocks',
    'sessions', 'session_exercises', 'sets'
  ]
  loop
    execute format(
      'create policy "accès propriétaire" on public.%I
         for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
--  Privilèges
--  Supabase accorde des privilèges par défaut sur le schéma `public`,
--  mais on les pose explicitement : la migration reste valable sur un
--  Postgres nu et ne dépend pas d'un réglage du projet.
--
--  La RLS ci-dessus fait le tri entre les lignes ; ces GRANT ne font
--  qu'ouvrir les tables au rôle connecté.
-- ═══════════════════════════════════════════════════════════════════

-- Les rôles `authenticated` et `anon` sont fournis par Supabase. On teste
-- leur présence pour que ce fichier s'applique aussi sur un Postgres nu
-- (test local, CI) sans échouer sur un rôle absent.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
  end if;

  -- L'app est mono-utilisateur et toujours authentifiée : aucun accès anonyme.
  -- (La RLS le bloquerait déjà, auth.uid() étant nul, mais autant être explicite.)
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
--  Vues de lecture pour les statistiques
--  `security_invoker` : la vue s'exécute avec les droits de l'appelant,
--  donc la RLS des tables sous-jacentes continue de s'appliquer.
-- ═══════════════════════════════════════════════════════════════════

-- Meilleure série par exercice et par jour : alimente la courbe d'évolution
-- et le calcul des records, sans rapatrier tout l'historique côté client.
create view public.exercise_daily_bests
with (security_invoker = on) as
select
  s.user_id,
  se.exercise_id,
  s.date,
  max(coalesce(st.seconds, st.reps)) as best_value,
  sum(coalesce(st.reps, 0))          as total_reps,
  sum(coalesce(st.seconds, 0))       as total_seconds,
  count(*)                           as completed_sets
from public.sets st
join public.session_exercises se on se.id = st.session_exercise_id
join public.sessions s           on s.id  = se.session_id
where st.completed
group by s.user_id, se.exercise_id, s.date;

-- Jours d'entraînement distincts : base du streak et de la heatmap.
create view public.training_days
with (security_invoker = on) as
select
  user_id,
  date,
  count(*) as session_count
from public.sessions
where ended_at is not null
group by user_id, date;

-- Volume par catégorie : alimente le ratio pousser / tirer.
-- Un maintien isométrique compte 1 répétition pour 3 secondes, comme côté app.
create view public.volume_by_category
with (security_invoker = on) as
select
  s.user_id,
  e.category,
  s.date,
  sum(coalesce(st.reps, 0) + coalesce(st.seconds, 0) / 3.0) as volume
from public.sets st
join public.session_exercises se on se.id = st.session_exercise_id
join public.sessions s           on s.id  = se.session_id
join public.exercises e          on e.id  = se.exercise_id
where st.completed
group by s.user_id, e.category, s.date;

-- Streak en cours. Une séance aujourd'hui ou hier ne casse pas la série :
-- la journée en cours n'est pas encore terminée.
create or replace function public.current_streak()
returns integer
language sql
stable
security invoker
as $$
  with days as (
    select distinct date from public.training_days where user_id = auth.uid()
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

-- Privilèges des vues et de la fonction, créées après le bloc ci-dessus.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.exercise_daily_bests, public.training_days,
      public.volume_by_category to authenticated;
    grant execute on function public.current_streak() to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.exercise_daily_bests, public.training_days,
      public.volume_by_category from anon;
  end if;
end;
$$;
