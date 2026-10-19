import type { AppState } from '../types'
import { makeSeedState } from './seed'
import { STATE_VERSION, STORAGE_KEY } from './constants'

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
  clear(): Promise<void>
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
      if (!raw) return makeSeedState()
      const migrated = migrate(JSON.parse(raw))
      return migrated ?? makeSeedState()
    } catch (err) {
      // Stockage indisponible (navigation privée, quota) ou JSON corrompu :
      // on repart sur un état de démarrage plutôt que de planter l'app.
      console.warn('[barre] lecture du stockage impossible, état par défaut utilisé', err)
      return makeSeedState()
    }
  },

  async save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('[barre] écriture du stockage impossible', err)
    }
  },

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
