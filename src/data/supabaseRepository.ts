import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  Exercise,
  Routine,
  RoutineExercise,
  Session,
  SessionExercise,
  SetEntry,
  UserProgress,
} from '../types'
import { supabase } from '../lib/supabase'
import { OWNER_ID, STATE_VERSION } from './constants'
import type { Repository } from './repository'
import { reportSyncError, reportSyncOk } from './syncStatus'

/**
 * Implémentation Supabase de l'interface `Repository`.
 *
 * Le catalogue (exercices, échelles, routines intégrées) reste décrit dans
 * `src/data/*.ts` et n'est lu qu'en base par d'autres clients : ici on ne
 * persiste que ce qui appartient à l'athlète — séances, progressions,
 * routines perso et réglages.
 *
 * Deux précautions, parce que `save()` reçoit l'état entier à chaque frappe :
 *
 * 1. Les écritures sont regroupées (debounce) et sérialisées, pour ne pas
 *    envoyer une requête par caractère ni les voir se croiser.
 * 2. On garde un instantané de ce que la base contient (`snapshot`) et on
 *    ne réécrit que les séances et routines dont le JSON a changé. Sans ça,
 *    chaque sauvegarde réécrirait tout l'historique.
 */

const SAVE_DEBOUNCE_MS = 700
/** Les séries d'un seed de démo se comptent par milliers : on découpe. */
const INSERT_CHUNK = 500

// ─── État du module ─────────────────────────────────────────────────

/**
 * Propriétaire des lignes. Constant : il n'y a ni compte ni session à
 * attendre, l'app peut lire et écrire dès le premier rendu.
 */
const userId: string = OWNER_ID
/** Dernier état connu de la base, pour n'écrire que les différences. */
let snapshot: AppState | null = null
/** Chargement échoué : on n'écrit plus, pour ne pas écraser le distant. */
let degraded = false

let timer: ReturnType<typeof setTimeout> | undefined
let pending: AppState | null = null
let chain: Promise<void> = Promise.resolve()

// ─── Lignes de la base ──────────────────────────────────────────────

interface SetRow {
  id: string
  position: number
  weight: number | string
  reps: number | null
  seconds: number | null
  tempo: string | null
  completed: boolean
}

interface SessionExerciseRow {
  id: string
  exercise_id: string
  position: number
  notes: string | null
  rest_seconds: number | null
  superset_group: string | null
  sets: SetRow[]
}

interface SessionRow {
  id: string
  date: string
  started_at: string
  ended_at: string | null
  routine_id: string | null
  name: string
  duration_seconds: number | null
  session_exercises: SessionExerciseRow[]
}

interface ExerciseRow {
  id: string
  name: string
  category: Exercise['category']
  type: Exercise['type']
  muscles: string[] | null
  description: string | null
  common_mistakes: string[] | null
  difficulty: number
}

interface RoutineExerciseRow {
  exercise_id: string
  position: number
  sets: number
  target_reps: number | null
  target_seconds: number | null
  rest_seconds: number
  tempo: string | null
  superset_group: string | null
}

interface RoutineRow {
  id: string
  name: string
  level: number
  track: string
  category: Routine['category']
  frequency_per_week: number
  estimated_minutes: number
  routine_exercises: RoutineExerciseRow[]
}

interface ProfileRow {
  display_name: string
  active_routine_id: string | null
  favorite_chart_exercise_id: string | null
}

const SESSION_SELECT =
  'id, date, started_at, ended_at, routine_id, name, duration_seconds,' +
  ' session_exercises (id, exercise_id, position, notes, rest_seconds, superset_group,' +
  ' sets (id, position, weight, reps, seconds, tempo, completed))'

const EXERCISE_SELECT =
  'id, name, category, type, muscles, description, common_mistakes, difficulty'

const ROUTINE_SELECT =
  'id, name, level, track, category, frequency_per_week, estimated_minutes,' +
  ' routine_exercises (exercise_id, position, sets, target_reps, target_seconds,' +
  ' rest_seconds, tempo, superset_group)'

// ─── Utilitaires ────────────────────────────────────────────────────

function client(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase non configuré : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return supabase
}

/** Déclenche la requête et transforme une erreur PostgREST en exception. */
async function run(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query
  if (error) throw new Error(error.message)
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function byPosition<T extends { position: number }>(a: T, b: T) {
  return a.position - b.position
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    out.push(rows.slice(i, i + INSERT_CHUNK))
  }
  return out
}

/** La base impose « répétitions OU maintien », jamais les deux ni aucun. */
function repsXorSeconds(reps?: number, seconds?: number) {
  if (reps == null && seconds != null) return { reps: null, seconds }
  return { reps: reps ?? 0, seconds: null }
}

/** Même règle pour les cibles de routine, qui doivent en plus être > 0. */
function targetXor(reps?: number, seconds?: number) {
  if (reps == null && seconds != null) return { target_reps: null, target_seconds: seconds }
  return { target_reps: reps ?? 1, target_seconds: null }
}

/** Les séances en cours et terminées vivent dans la même table. */
function allSessions(state: AppState): Session[] {
  return state.activeSession ? [...state.sessions, state.activeSession] : state.sessions
}

function profileOf(state: AppState) {
  return {
    display_name: state.settings.name,
    active_routine_id: state.activeRoutineId ?? null,
    favorite_chart_exercise_id: state.settings.favoriteChartExerciseId ?? null,
  }
}

// ─── Lecture ────────────────────────────────────────────────────────

function mapSession(row: SessionRow): Session {
  const exercises: SessionExercise[] = [...row.session_exercises]
    .sort(byPosition)
    .map((ex) => ({
      id: ex.id,
      exerciseId: ex.exercise_id,
      notes: ex.notes ?? undefined,
      restSeconds: ex.rest_seconds ?? undefined,
      supersetGroup: ex.superset_group ?? undefined,
      sets: [...ex.sets].sort(byPosition).map(
        (set): SetEntry => ({
          id: set.id,
          weight: Number(set.weight),
          reps: set.reps ?? undefined,
          seconds: set.seconds ?? undefined,
          tempo: set.tempo ?? undefined,
          completed: set.completed,
        }),
      ),
    }))

  return {
    id: row.id,
    date: row.date,
    // Postgres rend « +00:00 » là où l'app écrit « Z » : même instant, mais le
    // modèle promet de l'ISO complet, et un aller-retour à l'identique évite
    // de croire qu'une séance a changé.
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
    routineId: row.routine_id ?? undefined,
    name: row.name,
    durationSeconds: row.duration_seconds ?? undefined,
    exercises,
  }
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    type: row.type,
    muscles: row.muscles ?? [],
    description: row.description ?? '',
    commonMistakes: row.common_mistakes ?? [],
    difficulty: (row.difficulty as Exercise['difficulty']) ?? 1,
    custom: true,
  }
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    track: row.track,
    category: row.category,
    frequencyPerWeek: row.frequency_per_week,
    estimatedMinutes: row.estimated_minutes,
    custom: true,
    exercises: [...row.routine_exercises].sort(byPosition).map(
      (re): RoutineExercise => ({
        exerciseId: re.exercise_id,
        sets: re.sets,
        targetReps: re.target_reps ?? undefined,
        targetSeconds: re.target_seconds ?? undefined,
        restSeconds: re.rest_seconds,
        tempo: re.tempo ?? undefined,
        supersetGroup: re.superset_group ?? undefined,
      }),
    ),
  }
}

async function fetchState(db: SupabaseClient, uid: string): Promise<AppState> {
  const [profile, exercises, routines, progress, unlocks, sessions] = await Promise.all([
    db
      .from('profiles')
      .select('display_name, active_routine_id, favorite_chart_exercise_id')
      .eq('id', uid)
      .maybeSingle(),
    // Le catalogue intégré (user_id null) reste décrit en TypeScript : on ne
    // lit ici que les exercices créés par l'athlète.
    db.from('exercises').select(EXERCISE_SELECT).eq('user_id', uid),
    db.from('routines').select(ROUTINE_SELECT).eq('user_id', uid),
    db.from('user_progress').select('path_id, current_step').eq('user_id', uid),
    db.from('progression_unlocks').select('path_id, step, unlocked_on').eq('user_id', uid),
    // Ordre chronologique, comme l'historique généré côté app.
    db.from('sessions').select(SESSION_SELECT).eq('user_id', uid).order('date'),
  ])

  if (profile.error) throw new Error(profile.error.message)
  if (exercises.error) throw new Error(exercises.error.message)
  if (routines.error) throw new Error(routines.error.message)
  if (progress.error) throw new Error(progress.error.message)
  if (unlocks.error) throw new Error(unlocks.error.message)
  if (sessions.error) throw new Error(sessions.error.message)

  const mapped = ((sessions.data ?? []) as unknown as SessionRow[]).map(mapSession)
  // `unlockedAt` est un objet côté app, une ligne par barreau en base.
  const unlockedByPath = new Map<string, Record<number, string>>()
  for (const row of unlocks.data ?? []) {
    const record = unlockedByPath.get(row.path_id) ?? {}
    record[row.step] = row.unlocked_on
    unlockedByPath.set(row.path_id, record)
  }

  const row = profile.data as ProfileRow | null

  return {
    version: STATE_VERSION,
    sessions: mapped.filter((s) => s.endedAt),
    activeSession: mapped.find((s) => !s.endedAt),
    progress: (progress.data ?? []).map(
      (p): UserProgress => ({
        pathId: p.path_id,
        currentStep: p.current_step,
        unlockedAt: unlockedByPath.get(p.path_id) ?? {},
      }),
    ),
    customRoutines: ((routines.data ?? []) as unknown as RoutineRow[]).map(mapRoutine),
    customExercises: ((exercises.data ?? []) as unknown as ExerciseRow[]).map(mapExercise),
    activeRoutineId: row?.active_routine_id ?? undefined,
    settings: {
      name: row?.display_name ?? 'Athlète',
      favoriteChartExerciseId: row?.favorite_chart_exercise_id ?? undefined,
    },
  }
}

// ─── Écriture ───────────────────────────────────────────────────────

/**
 * Pousse les exercices perso. Appelé AVANT tout le reste : une routine ou une
 * série fraîchement créée peut déjà pointer vers un exercice perso, et la base
 * refuse une référence vers une ligne absente.
 */
async function syncExercises(db: SupabaseClient, uid: string, state: AppState, prev: AppState | null) {
  const previous = new Map((prev?.customExercises ?? []).map((e) => [e.id, e]))
  const changed = state.customExercises.filter((e) => !sameJson(e, previous.get(e.id)))
  if (!changed.length) return

  await run(
    db.from('exercises').upsert(
      changed.map((e) => ({
        id: e.id,
        user_id: uid,
        name: e.name,
        category: e.category,
        type: e.type,
        muscles: e.muscles,
        description: e.description,
        common_mistakes: e.commonMistakes,
        difficulty: e.difficulty,
      })),
    ),
  )
}

/**
 * Suppressions d'exercices perso, en toute fin de synchronisation : la base
 * interdit (`on delete restrict`) d'effacer un exercice encore référencé par
 * une série, et les séances concernées viennent peut-être d'être supprimées.
 */
async function pruneExercises(db: SupabaseClient, uid: string, state: AppState, prev: AppState | null) {
  const kept = new Set(state.customExercises.map((e) => e.id))
  const removed = (prev?.customExercises ?? []).map((e) => e.id).filter((id) => !kept.has(id))
  if (!removed.length) return
  await run(db.from('exercises').delete().eq('user_id', uid).in('id', removed))
}

async function syncRoutines(db: SupabaseClient, uid: string, state: AppState, prev: AppState | null) {
  const previous = new Map((prev?.customRoutines ?? []).map((r) => [r.id, r]))
  const changed = state.customRoutines.filter((r) => !sameJson(r, previous.get(r.id)))

  if (changed.length) {
    await run(
      db.from('routines').upsert(
        changed.map((r) => ({
          id: r.id,
          user_id: uid,
          name: r.name,
          level: r.level,
          track: r.track,
          category: r.category,
          frequency_per_week: r.frequencyPerWeek,
          estimated_minutes: r.estimatedMinutes,
        })),
      ),
    )
    const ids = changed.map((r) => r.id)
    await run(
      db.from('routine_exercises').delete().eq('user_id', uid).in('routine_id', ids),
    )
    const lines = changed.flatMap((r) =>
      r.exercises.map((re, index) => ({
        id: `${r.id}-${index}`,
        user_id: uid,
        routine_id: r.id,
        exercise_id: re.exerciseId,
        position: index,
        sets: re.sets,
        ...targetXor(re.targetReps, re.targetSeconds),
        rest_seconds: re.restSeconds,
        tempo: re.tempo ?? null,
        superset_group: re.supersetGroup ?? null,
      })),
    )
    for (const batch of chunks(lines)) {
      await run(db.from('routine_exercises').insert(batch))
    }
  }

  const kept = new Set(state.customRoutines.map((r) => r.id))
  const removed = [...previous.keys()].filter((id) => !kept.has(id))
  // Sans instantané on ignore les suppressions : on ne sait pas ce qui existait.
  if (removed.length) {
    await run(db.from('routines').delete().eq('user_id', uid).in('id', removed))
  }
}

async function syncProgress(db: SupabaseClient, uid: string, state: AppState) {
  if (state.progress.length) {
    await run(
      db.from('user_progress').upsert(
        state.progress.map((p) => ({
          user_id: uid,
          path_id: p.pathId,
          current_step: p.currentStep,
        })),
      ),
    )
    const kept = state.progress.map((p) => p.pathId)
    await run(
      db
        .from('user_progress')
        .delete()
        .eq('user_id', uid)
        .not('path_id', 'in', `(${kept.join(',')})`),
    )
  } else {
    await run(db.from('user_progress').delete().eq('user_id', uid))
  }

  // Quelques dizaines de lignes au total : on les réécrit en entier.
  await run(db.from('progression_unlocks').delete().eq('user_id', uid))
  const unlocks = state.progress.flatMap((p) =>
    Object.entries(p.unlockedAt).map(([step, day]) => ({
      user_id: uid,
      path_id: p.pathId,
      step: Number(step),
      unlocked_on: day.slice(0, 10),
    })),
  )
  if (unlocks.length) {
    for (const batch of chunks(unlocks)) {
      await run(db.from('progression_unlocks').insert(batch))
    }
  }
}

async function syncSessions(db: SupabaseClient, uid: string, state: AppState, prev: AppState | null) {
  const previous = new Map((prev ? allSessions(prev) : []).map((s) => [s.id, s]))
  const current = allSessions(state)
  const changed = current.filter((s) => !sameJson(s, previous.get(s.id)))

  if (changed.length) {
    await run(
      db.from('sessions').upsert(
        changed.map((s) => ({
          id: s.id,
          user_id: uid,
          date: s.date,
          started_at: s.startedAt,
          ended_at: s.endedAt ?? null,
          routine_id: s.routineId ?? null,
          name: s.name,
        })),
      ),
    )

    // Les exercices et séries d'une séance modifiée sont réécrits : c'est une
    // poignée de lignes, et ça évite de diffuser des ordres de position.
    const ids = changed.map((s) => s.id)
    for (const batch of chunks(ids)) {
      await run(
        db.from('session_exercises').delete().eq('user_id', uid).in('session_id', batch),
      )
    }

    const exerciseRows = changed.flatMap((s) =>
      s.exercises.map((ex, index) => ({
        id: ex.id,
        user_id: uid,
        session_id: s.id,
        exercise_id: ex.exerciseId,
        position: index,
        notes: ex.notes ?? null,
        rest_seconds: ex.restSeconds ?? null,
        superset_group: ex.supersetGroup ?? null,
      })),
    )
    for (const batch of chunks(exerciseRows)) {
      await run(db.from('session_exercises').insert(batch))
    }

    const setRows = changed.flatMap((s) =>
      s.exercises.flatMap((ex) =>
        ex.sets.map((set, index) => ({
          id: set.id,
          user_id: uid,
          session_exercise_id: ex.id,
          position: index,
          weight: set.weight,
          ...repsXorSeconds(set.reps, set.seconds),
          tempo: set.tempo ?? null,
          completed: set.completed,
        })),
      ),
    )
    for (const batch of chunks(setRows)) {
      await run(db.from('sets').insert(batch))
    }
  }

  const kept = new Set(current.map((s) => s.id))
  const removed = [...previous.keys()].filter((id) => !kept.has(id))
  for (const batch of chunks(removed)) {
    await run(db.from('sessions').delete().eq('user_id', uid).in('id', batch))
  }
}

/**
 * Pousse l'état complet. L'ordre compte : les routines perso avant le profil
 * et les séances qui les référencent, les suppressions de séances en dernier.
 */
async function sync(state: AppState) {
  const db = client()
  const uid = userId

  const prev = snapshot
  await syncExercises(db, uid, state, prev)
  await syncRoutines(db, uid, state, prev)

  if (!prev || !sameJson(profileOf(state), profileOf(prev))) {
    await run(db.from('profiles').upsert({ id: uid, ...profileOf(state) }))
  }
  if (!prev || !sameJson(state.progress, prev.progress)) {
    await syncProgress(db, uid, state)
  }
  await syncSessions(db, uid, state, prev)
  await pruneExercises(db, uid, state, prev)

  // Instantané mis à jour seulement si tout est passé : un échec en cours de
  // route laisse l'ancien, et la prochaine sauvegarde rejoue les différences.
  snapshot = clone(state)
}

function flush() {
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }
  const state = pending
  pending = null
  if (!state) return chain
  chain = chain
    .then(() => sync(state))
    .then(() => reportSyncOk())
    .catch((err) => {
      console.warn(
        '[barre] écriture Supabase impossible, nouvelle tentative au prochain changement',
        err,
      )
      // L'état reste en attente : un nouveau changement ou un « Réessayer »
      // rejoue l'écriture, et `snapshot` n'a pas bougé donc rien n'est perdu.
      if (!pending) pending = state
      reportSyncError(
        err instanceof Error
          ? `Enregistrement en ligne impossible : ${err.message}`
          : 'Enregistrement en ligne impossible.',
      )
    })
  return chain
}

if (typeof window !== 'undefined') {
  // Dernière chance d'écrire ce qui est encore en attente.
  window.addEventListener('pagehide', () => void flush())
}

// ─── Repository ─────────────────────────────────────────────────────

export const supabaseRepository: Repository = {
  async load() {
    const db = client()
    snapshot = null
    degraded = false
    pending = null

    try {
      // Un compte neuf arrive vide, et c'est voulu : écrire l'historique de
      // démonstration ici rendrait faux le streak, les records et les courbes
      // du premier jour. La démo se charge depuis les réglages, à la demande.
      const state = await fetchState(db, userId)
      snapshot = clone(state)
      return state
    } catch (err) {
      // On garde l'app utilisable, mais sans écrire : écraser le distant avec
      // un état partiel serait pire qu'un écran vide.
      degraded = true
      console.error('[barre] lecture Supabase impossible, écritures suspendues', err)
      reportSyncError(
        'Données en ligne illisibles : rien ne sera enregistré tant que l’app n’est pas rechargée.',
      )
      throw err instanceof Error ? err : new Error(String(err))
    }
  },

  async save(state) {
    // `degraded` = la lecture initiale a échoué : on n'écrase pas le distant
    // avec un état partiel.
    if (degraded) return
    pending = state
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void flush()
    }, SAVE_DEBOUNCE_MS)
  },

  /**
   * Vide la file d'attente tout de suite. `useData` l'appelle à la fin d'une
   * séance : attendre les 700 ms de regroupement, c'est risquer de perdre la
   * séance si l'athlète verrouille son téléphone dans la seconde.
   */
  async flush() {
    await flush()
  },

  async clear() {
    const db = client()
    const uid = userId
    pending = null
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    // Les enfants partent en cascade ; le catalogue partagé (user_id null) reste.
    await run(db.from('sessions').delete().eq('user_id', uid))
    await run(db.from('progression_unlocks').delete().eq('user_id', uid))
    await run(db.from('user_progress').delete().eq('user_id', uid))
    await run(db.from('routines').delete().eq('user_id', uid))
    await run(db.from('exercises').delete().eq('user_id', uid))
    await run(
      db
        .from('profiles')
        .update({ active_routine_id: null, favorite_chart_exercise_id: null })
        .eq('id', uid),
    )
    snapshot = null
  },
}
