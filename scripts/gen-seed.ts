/**
 * Génère `supabase/seed/catalogue.sql` à partir des données TypeScript.
 *
 *   npm run gen:seed
 *
 * Le catalogue n'existe qu'à un seul endroit (src/data/*.ts) ; ce script
 * le traduit en SQL pour qu'il ne puisse pas diverger de l'app.
 */
import { EXERCISES } from '../src/data/exercises'
import { PROGRESSIONS } from '../src/data/progressions'
import { ROUTINES } from '../src/data/routines'

/** Littéral texte SQL : les apostrophes se doublent. */
const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const arr = (xs: string[]) => (xs.length ? `array[${xs.map(q).join(', ')}]` : `'{}'`)
const n = (x: number | undefined) => (x === undefined ? 'null' : String(x))

const out: string[] = []
out.push(`-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Barre — catalogue intégré                                       ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- GÉNÉRÉ depuis src/data/{exercises,progressions,routines}.ts.
-- Ne pas éditer à la main : modifier les fichiers TypeScript puis
-- relancer \`npm run gen:seed\`.
--
-- Toutes les lignes ont user_id = NULL : contenu partagé, visible en
-- lecture par tous les comptes, modifiable par personne via l'API.
-- Le script est idempotent, on peut le rejouer à volonté.

begin;

-- Les tables de liaison sont reconstruites, les autres mises à jour en place
-- (un exercice ne peut pas être supprimé s'il est référencé par une séance).
delete from public.progression_steps where user_id is null;
delete from public.routine_exercises where user_id is null;
`)

out.push(`\n-- ─── Chemins de progression ───────────────────────────────────────\n`)
out.push(`insert into public.progression_paths (id, user_id, name, category) values`)
out.push(
  PROGRESSIONS.map((p) => `  (${q(p.id)}, null, ${q(p.name)}, ${q(p.category)})`).join(',\n') +
    `\non conflict (id) do update set name = excluded.name, category = excluded.category;\n`,
)

out.push(`\n-- ─── Exercices (${EXERCISES.length}) ──────────────────────────────────────────────\n`)
out.push(
  `insert into public.exercises (id, user_id, name, category, type, muscles, description, common_mistakes, difficulty) values`,
)
out.push(
  EXERCISES.map(
    (e) =>
      `  (${q(e.id)}, null, ${q(e.name)}, ${q(e.category)}, ${q(e.type)},\n   ${arr(e.muscles)},\n   ${q(e.description)},\n   ${arr(e.commonMistakes)}, ${e.difficulty})`,
  ).join(',\n') +
    `\non conflict (id) do update set
  name            = excluded.name,
  category        = excluded.category,
  type            = excluded.type,
  muscles         = excluded.muscles,
  description     = excluded.description,
  common_mistakes = excluded.common_mistakes,
  difficulty      = excluded.difficulty;\n`,
)

out.push(`\n-- ─── Barreaux des échelles ────────────────────────────────────────\n`)
out.push(
  `insert into public.progression_steps
  (user_id, path_id, exercise_id, position, criterion_sets, criterion_reps, criterion_seconds, criterion_label) values`,
)
out.push(
  PROGRESSIONS.flatMap((p) =>
    p.steps.map(
      (s, i) =>
        `  (null, ${q(p.id)}, ${q(s.exerciseId)}, ${i}, ${s.criterion.sets}, ${n(s.criterion.reps)}, ${n(s.criterion.seconds)}, ${q(s.criterion.label)})`,
    ),
  ).join(',\n') + ';\n',
)

out.push(`\n-- ─── Routines intégrées ───────────────────────────────────────────\n`)
out.push(
  `insert into public.routines (id, user_id, name, level, track, category, frequency_per_week, estimated_minutes) values`,
)
out.push(
  ROUTINES.map(
    (r) =>
      `  (${q(r.id)}, null, ${q(r.name)}, ${r.level}, ${q(r.track)}, ${q(r.category)}, ${r.frequencyPerWeek}, ${r.estimatedMinutes})`,
  ).join(',\n') +
    `\non conflict (id) do update set
  name               = excluded.name,
  level              = excluded.level,
  track              = excluded.track,
  category           = excluded.category,
  frequency_per_week = excluded.frequency_per_week,
  estimated_minutes  = excluded.estimated_minutes;\n`,
)

out.push(`\n-- ─── Exercices des routines ───────────────────────────────────────\n`)
out.push(
  `insert into public.routine_exercises
  (user_id, routine_id, exercise_id, position, sets, target_reps, target_seconds, rest_seconds, tempo, superset_group) values`,
)
out.push(
  ROUTINES.flatMap((r) =>
    r.exercises.map(
      (e, i) =>
        // La clé de superset est préfixée par la routine : deux routines
        // peuvent réutiliser le même nom de groupe sans se mélanger.
        `  (null, ${q(r.id)}, ${q(e.exerciseId)}, ${i}, ${e.sets}, ${n(e.targetReps)}, ${n(e.targetSeconds)}, ${e.restSeconds}, ${e.tempo ? q(e.tempo) : 'null'}, ${e.supersetGroup ? q(`${r.id}-${e.supersetGroup}`) : 'null'})`,
    ),
  ).join(',\n') + ';\n',
)

out.push(`\ncommit;\n`)
process.stdout.write(out.join('\n'))
