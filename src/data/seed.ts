import type { AppState, Session, SessionExercise, SetEntry } from '../types'
import { getExercise } from './exercises'
import { ROUTINES } from './routines'
import { addDays, toDayKey, uid } from '../lib/utils'
import { STATE_VERSION } from './constants'

/**
 * États de départ.
 *
 * `makeEmptyState()` est ce que voit un compte neuf : aucune séance, donc un
 * streak, des records et des courbes qui ne décrivent que de vraies séances.
 *
 * `makeSeedState()` est un historique de démonstration (10 semaines, avec une
 * progression réaliste) : utile pour voir à quoi ressemblent les écrans
 * remplis, mais chargé seulement si l'athlète le demande depuis les réglages.
 * Ces séances ne doivent jamais arriver dans un compte par surprise : elles
 * fausseraient tous les chiffres.
 */

export function makeEmptyState(): AppState {
  return {
    version: STATE_VERSION,
    sessions: [],
    progress: [],
    customRoutines: [],
    customExercises: [],
    activeRoutineId: 'rt-fb-3',
    settings: { name: 'Athlète' },
  }
}

/** Générateur pseudo-aléatoire déterministe : même démo à chaque fois. */
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const rng = makeRng(20_251_019)

function buildSets(
  exerciseId: string,
  sets: number,
  baseValue: number,
  restSeconds: number,
  tempo?: string,
): SessionExercise {
  const exercise = getExercise(exerciseId)
  const entries: SetEntry[] = []
  for (let i = 0; i < sets; i++) {
    // Légère dégressivité sur les dernières séries, comme dans la vraie vie.
    const fatigue = i === 0 ? 0 : Math.round(i * (0.5 + rng() * 0.6))
    const value = Math.max(1, baseValue - fatigue)
    entries.push({
      id: uid('set'),
      weight: 0,
      ...(exercise?.type === 'time' ? { seconds: value } : { reps: value }),
      tempo,
      completed: true,
    })
  }
  return { id: uid('sex'), exerciseId, sets: entries, restSeconds }
}

/**
 * Écarts (en jours) entre deux séances, répétés en boucle en remontant
 * depuis aujourd'hui. Le cycle commence par deux jours consécutifs pour
 * que le streak de l'accueil soit parlant dès le premier lancement.
 */
const GAP_CYCLE = [1, 1, 2, 3, 2, 3, 2]
const HISTORY_DAYS = 70

export function makeSeedState(): AppState {
  const sessions: Session[] = []
  const today = new Date()

  // Décalages en jours depuis aujourd'hui : 0, 1, 2, 4, 7, 9, 12…
  const offsets: number[] = []
  for (let offset = 0, i = 0; offset <= HISTORY_DAYS; i++) {
    offsets.push(offset)
    offset += GAP_CYCLE[i % GAP_CYCLE.length]
  }

  // On construit de la plus ancienne à la plus récente pour que la
  // progression des charges aille dans le bon sens.
  offsets
    .slice()
    .reverse()
    .forEach((offset, idx) => {
      const date = addDays(today, -offset)
      // 0 au début de l'historique → 1 aujourd'hui.
      const growth = (1 - offset / HISTORY_DAYS) * 5
      const routine = ROUTINES[idx % 3]

      const startedAt = new Date(date)
      startedAt.setHours(18, 30, 0, 0)
      const durationSeconds = Math.round((32 + rng() * 22) * 60)

      const variant = idx % 3
      const exercises: SessionExercise[] =
        variant === 0
          ? [
              buildSets('ex-pullup', 4, Math.round(5 + growth), 150),
              buildSets('ex-pushup', 4, Math.round(14 + growth * 1.5), 90, '3-1-1-0'),
              buildSets('ex-australian-row', 3, 12, 90),
              buildSets('ex-hollow-hold', 3, Math.round(25 + growth * 2), 45),
            ]
          : variant === 1
            ? [
                buildSets('ex-dip', 4, Math.round(8 + growth), 120),
                buildSets('ex-pistol-squat', 3, Math.round(4 + growth * 0.8), 120),
                buildSets('ex-tuck-planche', 4, Math.round(10 + growth * 1.2), 120),
                buildSets('ex-calf-raise', 3, 20, 45),
              ]
            : [
                buildSets('ex-pullup', 3, Math.round(4 + growth), 150),
                buildSets('ex-diamond-pushup', 3, Math.round(9 + growth), 90),
                buildSets('ex-tuck-front-lever', 4, Math.round(9 + growth), 120),
                buildSets('ex-deep-squat-hold', 2, 60, 30),
              ]

      sessions.push({
        id: uid('ses'),
        date: toDayKey(date),
        startedAt: startedAt.toISOString(),
        endedAt: new Date(startedAt.getTime() + durationSeconds * 1000).toISOString(),
        routineId: routine.id,
        name: routine.name,
        exercises,
        durationSeconds,
      })
    })

  return {
    version: STATE_VERSION,
    sessions,
    progress: [
      { pathId: 'prog-pushup', currentStep: 3, unlockedAt: {} },
      { pathId: 'prog-pullup', currentStep: 3, unlockedAt: {} },
      { pathId: 'prog-squat', currentStep: 3, unlockedAt: {} },
      // Les échelles statiques ont gagné des barreaux d'entrée : l'index
      // suit la planche groupée et le front lever groupé, comme avant.
      { pathId: 'prog-planche', currentStep: 3, unlockedAt: {} },
      { pathId: 'prog-frontlever', currentStep: 1, unlockedAt: {} },
      { pathId: 'prog-lsit', currentStep: 2, unlockedAt: {} },
      { pathId: 'prog-handstand', currentStep: 2, unlockedAt: {} },
      { pathId: 'prog-backlever', currentStep: 2, unlockedAt: {} },
    ],
    customRoutines: [],
    customExercises: [],
    activeRoutineId: 'rt-fb-3',
    settings: { name: 'Athlète', favoriteChartExerciseId: 'ex-pullup' },
  }
}
