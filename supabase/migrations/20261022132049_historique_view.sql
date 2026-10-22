-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — vue `historique`                                        ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- Les séances vivent dans `sessions` / `session_exercises` / `sets` : trois
-- tables pensées pour l'écriture, pénibles à lire à la main. Cette vue est la
-- lecture humaine qui manquait — ouverte dans l'éditeur de tables Supabase,
-- elle se lit comme un carnet d'entraînement : une ligne par série.
--
-- En lecture seule, et dérivée des tables : aucune donnée dupliquée, donc
-- rien qui puisse se désynchroniser.
create or replace view public.historique
with (security_invoker = on) as
select
  s.date,
  s.name                                   as seance,
  e.name                                   as exercice,
  e.category                               as categorie,
  se.position + 1                          as ordre_exercice,
  st.position + 1                          as serie,
  st.reps,
  st.seconds,
  st.weight                                as lest_kg,
  st.tempo,
  st.completed                             as validee,
  se.notes,
  s.duration_seconds                       as duree_seance_s,
  s.started_at
from public.sets st
join public.session_exercises se on se.id = st.session_exercise_id
join public.sessions s           on s.id  = se.session_id
join public.exercises e          on e.id  = se.exercise_id
order by s.started_at desc, se.position, st.position;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.historique to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.historique to authenticated;
  end if;
end;
$$;
