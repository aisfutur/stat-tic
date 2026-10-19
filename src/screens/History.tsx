import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { EXERCISE_BY_ID } from '../data/exercises'
import { Sheet } from '../components/Sheet'
import { IconArrowLeft, IconClock, IconTrash } from '../components/Icons'
import { setValue } from '../lib/stats'
import { formatLongDate, formatShortDuration, fromDayKey } from '../lib/utils'

export function History() {
  const { state, deleteSession } = useData()
  const [openId, setOpenId] = useState<string | null>(null)

  const sessions = useMemo(
    () =>
      [...state.sessions].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ),
    [state.sessions],
  )

  const detail = sessions.find((s) => s.id === openId)

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-full p-2 text-muted hover:bg-concrete-800 hover:text-chalk"
          aria-label="Retour à l’accueil"
        >
          <IconArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-4xl leading-none">Historique</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="num">{sessions.length}</span> séances enregistrées
          </p>
        </div>
      </header>

      {sessions.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          Aucune séance pour l’instant.
        </p>
      ) : (
        <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
          {sessions.map((session) => {
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
      )}

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
                const exercise = EXERCISE_BY_ID[ex.exerciseId]
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
    </div>
  )
}
