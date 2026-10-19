/**
 * Modèle de données de Barre.
 * Tout est sérialisable en JSON : les dates sont des chaînes ISO
 * (`YYYY-MM-DD` pour un jour, ISO complet pour un instant).
 */

export type Category = 'push' | 'pull' | 'legs' | 'core' | 'mobility'

/** Un exercice se mesure soit en répétitions, soit en temps de maintien (isométrique). */
export type MeasureType = 'reps' | 'time'

export interface Exercise {
  id: string
  name: string
  category: Category
  /** `reps` → compteur de répétitions ; `time` → chrono de maintien. */
  type: MeasureType
  muscles: string[]
  description: string
  /** Erreurs fréquentes, affichées dans le détail de l'exercice. */
  commonMistakes: string[]
  /** Chemin de progression auquel l'exercice appartient, si applicable. */
  progressionId?: string
  /** Index (0-based) de l'étape dans ce chemin. */
  progressionStep?: number
  /** 1 (accessible) → 5 (élite). */
  difficulty: 1 | 2 | 3 | 4 | 5
}

/** Critère chiffré de passage à l'étape suivante d'une progression. */
export interface Criterion {
  sets: number
  /** Répétitions par série (exercices `reps`). */
  reps?: number
  /** Secondes de maintien par série (exercices `time`). */
  seconds?: number
  label: string
}

export interface ProgressionStep {
  exerciseId: string
  criterion: Criterion
}

export interface ProgressionPath {
  id: string
  name: string
  category: Category
  /** Famille affichée dans l'écran Progressions (ex. « Statiques »). */
  family?: string
  /** Liste ordonnée, de la variante la plus simple à la plus dure. */
  steps: ProgressionStep[]
}

export interface UserProgress {
  pathId: string
  /** Index de l'étape en cours de travail. */
  currentStep: number
  /** Index d'étape → date ISO de validation. */
  unlockedAt: Record<number, string>
}

/** Cible prescrite par une routine pour un exercice. */
export interface RoutineExercise {
  exerciseId: string
  sets: number
  /** Cible en répétitions (exercices `reps`). */
  targetReps?: number
  /** Cible en secondes (exercices `time`). */
  targetSeconds?: number
  /** Repos en secondes après chaque série. */
  restSeconds: number
  /** Tempo type « 3-1-2-0 » (excentrique-pause-concentrique-pause). */
  tempo?: string
  /**
   * Identifiant de superset : les exercices partageant la même clé
   * s'enchaînent sans repos intermédiaire.
   */
  supersetGroup?: string
}

export interface Routine {
  id: string
  name: string
  /** Niveau 1 → 5 dans sa famille. */
  level: number
  /** Famille de routines (ex. « full-body », « push »). */
  track: string
  category: Category
  exercises: RoutineExercise[]
  /** Séances recommandées par semaine. */
  frequencyPerWeek: number
  estimatedMinutes: number
  /** Une routine personnalisée est créée par l'utilisateur, donc supprimable. */
  custom?: boolean
}

export interface SetEntry {
  id: string
  /** Lest ou assistance en kg (0 = poids du corps). Négatif = assisté. */
  weight: number
  /** Répétitions effectuées (exercices `reps`). */
  reps?: number
  /** Secondes tenues (exercices `time`). */
  seconds?: number
  tempo?: string
  completed: boolean
}

export interface SessionExercise {
  id: string
  exerciseId: string
  sets: SetEntry[]
  notes?: string
  restSeconds?: number
  supersetGroup?: string
}

export interface Session {
  id: string
  /** Jour de la séance, `YYYY-MM-DD`. */
  date: string
  startedAt: string
  /** Absent tant que la séance est en cours. */
  endedAt?: string
  routineId?: string
  name: string
  exercises: SessionExercise[]
  /** Durée réelle en secondes, figée à la fin de la séance. */
  durationSeconds?: number
}

/** Racine persistée (localStorage / futur backend). */
export interface AppState {
  version: number
  sessions: Session[]
  progress: UserProgress[]
  customRoutines: Routine[]
  /** Routine proposée sur l'accueil. */
  activeRoutineId?: string
  /** Séance en cours, restaurée telle quelle au rechargement de la page. */
  activeSession?: Session
  settings: {
    name: string
    /** Exercice affiché par défaut dans la courbe des statistiques. */
    favoriteChartExerciseId?: string
  }
}

/** Une série calculée pour les graphiques. */
export interface ChartPoint {
  date: string
  value: number
}
