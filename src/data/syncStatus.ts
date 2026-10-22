/**
 * État de la dernière écriture des données.
 *
 * Les repositories écrivent en arrière-plan : sans ce canal, un échec
 * (Supabase injoignable, quota `localStorage`, session expirée) ne laissait
 * qu'un `console.warn`, et l'athlète croyait sa séance enregistrée. L'app
 * affiche l'erreur et propose de réessayer — voir `components/SyncIndicator`.
 */
export interface SyncStatus {
  kind: 'idle' | 'error'
  /** Message affichable, présent seulement en erreur. */
  message?: string
}

const IDLE: SyncStatus = { kind: 'idle' }

let current: SyncStatus = IDLE
const listeners = new Set<(status: SyncStatus) => void>()

export function getSyncStatus(): SyncStatus {
  return current
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(next: SyncStatus) {
  // Évite de réveiller React quand rien ne change (une écriture réussie
  // succède en général à une écriture réussie).
  if (next.kind === current.kind && next.message === current.message) return
  current = next
  for (const listener of listeners) listener(next)
}

export function reportSyncOk(): void {
  emit(IDLE)
}

export function reportSyncError(message: string): void {
  emit({ kind: 'error', message })
}
