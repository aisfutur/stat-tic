import { useData } from '../hooks/useData'
import { IconX } from './Icons'

/**
 * Bandeau d'alerte quand la dernière écriture a échoué.
 *
 * Rien ne s'affiche en fonctionnement normal : l'app est optimiste, et un
 * indicateur à chaque frappe serait du bruit. Mais un échec silencieux est le
 * pire des cas — l'athlète termine sa séance, voit son historique à l'écran
 * (état local), et découvre la perte au rechargement suivant.
 *
 * Dans le flux de la page et non en position fixe : le bas de l'écran est déjà
 * pris par le minuteur de repos, et masquer le bouton « Terminer » pendant une
 * séance serait pire que le problème signalé.
 */
export function SyncIndicator() {
  const { syncStatus, retrySave } = useData()

  if (syncStatus.kind !== 'error') return null

  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-card border border-ember/50
        bg-ember/10 p-3"
    >
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
          bg-ember/15 text-ember"
        aria-hidden="true"
      >
        <IconX size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-xs text-ember">Non enregistré</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{syncStatus.message}</p>
      </div>
      <button
        type="button"
        onClick={retrySave}
        className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
      >
        Réessayer
      </button>
    </div>
  )
}
