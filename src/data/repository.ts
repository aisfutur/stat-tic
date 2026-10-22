import type { AppState, Exercise } from '../types'
import { makeEmptyState } from './seed'
import { STATE_VERSION, STORAGE_KEY } from './constants'
import { reportSyncError, reportSyncOk } from './syncStatus'

/**
 * Couche d'accès aux données, volontairement isolée du reste de l'app.
 *
 * L'implémentation actuelle lit/écrit `localStorage` de façon synchrone,
 * mais l'interface est asynchrone : brancher une vraie base (Supabase,
 * SQLite, API REST…) revient à fournir un autre objet `Repository`,
 * sans toucher aux composants.
 */
export interface Repository {
  load(): Promise<AppState>
  save(state: AppState): Promise<void>
  /**
   * Écrit immédiatement ce qui est encore en attente, sans attendre le
   * regroupement des écritures. Appelé aux moments où perdre les données
   * serait grave : fin de séance, fermeture de l'onglet.
   */
  flush(): Promise<void>
  clear(): Promise<void>
}

/**
 * Garde-fou sur les exercices perso : un import ou un état d'une version
 * antérieure peut en manquer, ou en contenir d'incomplets.
 */
function sanitizeExercises(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item): Exercise[] => {
    if (!item || typeof item !== 'object') return []
    const ex = item as Partial<Exercise>
    if (typeof ex.id !== 'string' || typeof ex.name !== 'string') return []
    return [
      {
        id: ex.id,
        name: ex.name,
        category: ex.category ?? 'push',
        type: ex.type === 'time' ? 'time' : 'reps',
        muscles: Array.isArray(ex.muscles) ? ex.muscles.filter((m) => typeof m === 'string') : [],
        description: typeof ex.description === 'string' ? ex.description : '',
        commonMistakes: Array.isArray(ex.commonMistakes)
          ? ex.commonMistakes.filter((m) => typeof m === 'string')
          : [],
        difficulty: ex.difficulty ?? 1,
        custom: true,
      },
    ]
  })
}

/** Migre un état d'une version antérieure. */
function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<AppState>
  if (!Array.isArray(candidate.sessions)) return null

  return {
    version: STATE_VERSION,
    sessions: candidate.sessions ?? [],
    progress: candidate.progress ?? [],
    customRoutines: candidate.customRoutines ?? [],
    // Absent des états v1 : la liste vide est la bonne valeur par défaut.
    customExercises: sanitizeExercises(candidate.customExercises),
    activeRoutineId: candidate.activeRoutineId,
    activeSession: candidate.activeSession,
    settings: {
      name: candidate.settings?.name ?? 'Athlète',
      favoriteChartExerciseId: candidate.settings?.favoriteChartExerciseId,
    },
  }
}

export const localRepository: Repository = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return makeEmptyState()
      const migrated = migrate(JSON.parse(raw))
      return migrated ?? makeEmptyState()
    } catch (err) {
      // Stockage indisponible (navigation privée, quota) ou JSON corrompu :
      // on repart sur un état de démarrage plutôt que de planter l'app.
      console.warn('[barre] lecture du stockage impossible, état par défaut utilisé', err)
      return makeEmptyState()
    }
  },

  async save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      reportSyncOk()
    } catch (err) {
      // Quota dépassé ou navigation privée : l'athlète doit le savoir, sinon
      // il croit son historique enregistré alors que rien n'est écrit.
      console.warn('[barre] écriture du stockage impossible', err)
      reportSyncError(
        'Enregistrement local impossible (stockage plein ou navigation privée).',
      )
    }
  },

  // Les écritures `localStorage` sont déjà synchrones : rien à vider.
  async flush() {},

  async clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('[barre] effacement du stockage impossible', err)
    }
  },
}

/** Valide un état importé depuis un fichier JSON. */
export function parseImportedState(json: string): AppState {
  const migrated = migrate(JSON.parse(json))
  if (!migrated) throw new Error('Fichier invalide : structure de données non reconnue.')
  return migrated
}
