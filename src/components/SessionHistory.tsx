import { useMemo, useState } from 'react'
import type { Session } from '../types'
import { useData } from '../hooks/useData'
import { getExercise } from '../data/exercises'
import { Sheet } from './Sheet'
import { IconClock, IconTrash } from './Icons'
import { setValue } from '../lib/stats'
import { formatLongDate, formatShortDuration, fromDayKey } from '../lib/utils'

/**
 * Liste des séances enregistrées, de la plus récente à la plus ancienne,
 * avec le détail série par série dans une feuille.
 *
 * Partagée par l'écran Historique et l'onglet Historique des statistiques :
 * une seule mise en forme à maintenir, et le même geste de suppression.
 */
export function SessionHistory({ sessions }: { sessions: Session[] }) {
  const { deleteSession } = useData()
  const [openId, setOpenId] = useState<string | null>(null)

  const ordered = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions],
  )

  const detail = ordered.find((s) => s.id === openId)

  if (ordered.length === 0) {
    return (
      <p className="card p-8 text-center text-sm text-muted">
        Aucune séance pour l’instant.
      </p>
    )
  }

  return (
    <>
      <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
        {ordered.map((session) => {
          const sets = session.exercises.reduce((a, ex) => a + ex.sets.length, 0)
          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => setOpenId(session.id)}
                className="card w-full p-4 text-left transition-colors hover:bg-concrete-700/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-tight">{session.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatLongDate(fromDayKey(session.date))}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xs text-muted">
                    {session.durationSeconds
                      ? formatShortDuration(session.durationSeconds)
                      : '—'}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="chip">
                    <span className="num">{session.exercises.length}</span> exercices
                  </span>
                  <span className="chip">
                    <span className="num">{sets}</span> séries
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <Sheet
        open={detail !== undefined}
        title={detail?.name ?? ''}
        onClose={() => setOpenId(null)}
        footer={
          detail && (
            <button
              type="button"
              onClick={() => {
                deleteSession(detail.id)
                setOpenId(null)
              }}
              className="btn-ghost w-full text-ember"
            >
              <IconTrash size={16} /> Supprimer cette séance
            </button>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{formatLongDate(fromDayKey(detail.date))}</span>
              {detail.durationSeconds && (
                <span className="chip">
                  <IconClock size={11} />
                  <span className="num">{formatShortDuration(detail.durationSeconds)}</span>
                </span>
              )}
            </div>

            <ul className="space-y-3">
              {detail.exercises.map((ex) => {
                const exercise = getExercise(ex.exerciseId)
                const isTime = exercise?.type === 'time'
                return (
                  <li
                    key={ex.id}
                    className="rounded-soft border border-concrete-600 bg-concrete-700/40 p-3"
                  >
                    <p className="font-display text-lg leading-tight">
                      {exercise?.name ?? ex.exerciseId}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {ex.sets.map((set, i) => (
                        <li key={set.id} className="flex items-baseline gap-2 text-sm">
                          <span className="num w-5 text-xs text-locked">{i + 1}</span>
                          <span className="num flex-1 text-chalk">
                            {setValue(set)}
                            <span className="ml-0.5 text-xs text-muted">
                              {isTime ? 's' : ' reps'}
                            </span>
                          </span>
                          {set.weight !== 0 && (
                            <span className="num text-xs text-muted">
                              {set.weight > 0 ? '+' : ''}
                              {set.weight} kg
                            </span>
                          )}
                          {set.tempo && (
                            <span className="num text-xs text-locked">{set.tempo}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {ex.notes && (
                      <p className="mt-2 border-t border-concrete-600 pt-2 text-xs italic text-muted">
                        {ex.notes}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Sheet>
    </>
  )
}
