import type { Category, ChartPoint, Session, SetEntry } from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import { addDays, daysBetween, startOfWeek, toDayKey } from './utils'

/** Valeur mesurée d'une série, quel que soit son type. */
export function setValue(set: SetEntry): number {
  return set.seconds ?? set.reps ?? 0
}

/** Jours distincts où au moins une séance a été loggée, triés. */
export function trainedDays(sessions: Session[]): string[] {
  return [...new Set(sessions.map((s) => s.date))].sort()
}

/**
 * Streak = jours consécutifs d'entraînement.
 * Une séance aujourd'hui ou hier maintient le streak : on ne le casse pas
 * tant que la journée en cours n'est pas terminée.
 */
export function computeStreak(sessions: Session[]): number {
  const days = new Set(trainedDays(sessions))
  if (days.size === 0) return 0

  const today = toDayKey()
  let cursor = days.has(today) ? new Date() : addDays(new Date(), -1)
  if (!days.has(toDayKey(cursor))) return 0

  let streak = 0
  while (days.has(toDayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Plus longue série de jours consécutifs de tout l'historique. */
export function computeLongestStreak(sessions: Session[]): number {
  const days = trainedDays(sessions)
  if (days.length === 0) return 0
  let best = 1
  let current = 1
  for (let i = 1; i < days.length; i++) {
    current = daysBetween(days[i - 1], days[i]) === 1 ? current + 1 : 1
    best = Math.max(best, current)
  }
  return best
}

/** Meilleure performance (reps ou secondes) jamais enregistrée sur un exercice. */
export function personalRecord(sessions: Session[], exerciseId: string): number {
  let best = 0
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const set of ex.sets) {
        if (set.completed) best = Math.max(best, setValue(set))
      }
    }
  }
  return best
}

/** Dernière occurrence d'un exercice dans l'historique (séances triées par date). */
export function lastPerformance(
  sessions: Session[],
  exerciseId: string,
): { date: string; sets: SetEntry[] } | undefined {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  for (const session of sorted) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.length > 0) return { date: session.date, sets: ex.sets }
  }
  return undefined
}

/**
 * Courbe d'évolution d'un exercice : une valeur par séance, correspondant
 * à la meilleure série du jour.
 */
export function exerciseChartData(sessions: Session[], exerciseId: string): ChartPoint[] {
  const points: ChartPoint[] = []
  for (const session of sessions) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex) continue
    const best = Math.max(0, ...ex.sets.filter((s) => s.completed).map(setValue))
    if (best > 0) points.push({ date: session.date, value: best })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

/** Volume total (répétitions + secondes) par catégorie, sur `days` jours. */
export function volumeByCategory(
  sessions: Session[],
  days = 56,
): Record<Category, number> {
  const since = toDayKey(addDays(new Date(), -days))
  const totals: Record<Category, number> = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    mobility: 0,
  }
  for (const session of sessions) {
    if (session.date < since) continue
    for (const ex of session.exercises) {
      const exercise = EXERCISE_BY_ID[ex.exerciseId]
      if (!exercise) continue
      for (const set of ex.sets) {
        if (!set.completed) continue
        // Les isométriques sont convertis en « reps équivalentes » (3 s ≈ 1 rep)
        // pour qu'un maintien de 30 s ne pèse pas comme 30 tractions.
        totals[exercise.category] += set.seconds ? set.seconds / 3 : (set.reps ?? 0)
      }
    }
  }
  return totals
}

export interface PushPullBalance {
  push: number
  pull: number
  /** Part de pousser entre 0 et 1 (0.5 = équilibre parfait). */
  pushShare: number
  status: 'balanced' | 'push-heavy' | 'pull-heavy' | 'no-data'
  message: string
}

/** Un ratio pousser/tirer sain tient dans une fourchette 40–60 %. */
export function pushPullBalance(sessions: Session[], days = 56): PushPullBalance {
  const totals = volumeByCategory(sessions, days)
  const push = Math.round(totals.push)
  const pull = Math.round(totals.pull)
  const sum = push + pull

  if (sum === 0) {
    return {
      push,
      pull,
      pushShare: 0.5,
      status: 'no-data',
      message: 'Pas encore assez de données sur les 8 dernières semaines.',
    }
  }

  const pushShare = push / sum
  if (pushShare > 0.6) {
    return {
      push,
      pull,
      pushShare,
      status: 'push-heavy',
      message: 'Tu pousses nettement plus que tu ne tires. Ajoute du tirage pour tes épaules.',
    }
  }
  if (pushShare < 0.4) {
    return {
      push,
      pull,
      pushShare,
      status: 'pull-heavy',
      message: 'Beaucoup de tirage, peu de poussée. Un peu de dips ou de pompes rééquilibrerait.',
    }
  }
  return {
    push,
    pull,
    pushShare,
    status: 'balanced',
    message: 'Ratio pousser / tirer équilibré. Continue comme ça.',
  }
}

export interface HeatmapWeek {
  /** Lundi de la semaine, clé de jour. */
  weekStart: string
  /** 7 cases, lundi → dimanche. */
  days: Array<{ date: string; count: number; future: boolean }>
}

/** Grille type calendrier de contributions sur `weeks` semaines. */
export function trainingHeatmap(sessions: Session[], weeks = 12): HeatmapWeek[] {
  const counts = new Map<string, number>()
  for (const s of sessions) counts.set(s.date, (counts.get(s.date) ?? 0) + 1)

  const today = toDayKey()
  const firstMonday = addDays(startOfWeek(new Date()), -(weeks - 1) * 7)

  return Array.from({ length: weeks }, (_, w) => {
    const weekStart = addDays(firstMonday, w * 7)
    return {
      weekStart: toDayKey(weekStart),
      days: Array.from({ length: 7 }, (_, d) => {
        const date = toDayKey(addDays(weekStart, d))
        return { date, count: counts.get(date) ?? 0, future: date > today }
      }),
    }
  })
}

/** Séances faites dans la semaine en cours (lundi → dimanche). */
export function currentWeekDays(
  sessions: Session[],
): Array<{ date: string; trained: boolean; isToday: boolean; future: boolean }> {
  const done = new Set(sessions.map((s) => s.date))
  const monday = startOfWeek(new Date())
  const today = toDayKey()
  return Array.from({ length: 7 }, (_, i) => {
    const date = toDayKey(addDays(monday, i))
    return {
      date,
      trained: done.has(date),
      isToday: date === today,
      future: date > today,
    }
  })
}

/** Totaux affichés sur l'écran statistiques. */
export function globalTotals(sessions: Session[]) {
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0)
  const totalSets = sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((a, ex) => a + ex.sets.length, 0),
    0,
  )
  const totalReps = sessions.reduce(
    (acc, s) =>
      acc +
      s.exercises.reduce(
        (a, ex) => a + ex.sets.reduce((x, set) => x + (set.reps ?? 0), 0),
        0,
      ),
    0,
  )
  return {
    sessionCount: sessions.length,
    totalSeconds,
    totalSets,
    totalReps,
    avgSeconds: sessions.length ? Math.round(totalSeconds / sessions.length) : 0,
  }
}

/** Exercices déjà loggés au moins une fois, pour alimenter les sélecteurs. */
export function loggedExerciseIds(sessions: Session[]): string[] {
  const ids = new Set<string>()
  for (const s of sessions) for (const ex of s.exercises) ids.add(ex.exerciseId)
  return [...ids]
}

/**
 * Évalue si le critère de l'étape courante est atteint, pour proposer
 * automatiquement le passage au barreau suivant.
 */
export function criterionMet(
  sessions: Session[],
  exerciseId: string,
  criterion: { sets: number; reps?: number; seconds?: number },
): boolean {
  const target = criterion.seconds ?? criterion.reps ?? 0
  if (target === 0) return false
  // On cherche une seule séance où le critère est tenu sur toutes les séries requises.
  return sessions.some((session) => {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex) return false
    const qualifying = ex.sets.filter((s) => s.completed && setValue(s) >= target)
    return qualifying.length >= criterion.sets
  })
}
