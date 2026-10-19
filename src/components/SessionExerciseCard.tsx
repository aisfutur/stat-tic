import type { Exercise, SessionExercise, SetEntry } from '../types'
import { useData } from '../hooks/useData'
import { lastPerformance, setValue } from '../lib/stats'
import { IconCheck, IconLink, IconPlus, IconTrash } from './Icons'
import { cx, formatRelativeDay } from '../lib/utils'

interface Props {
  sessionExercise: SessionExercise
  exercise: Exercise
  index: number
  active: boolean
  /** Rang du superset pour l'affichage (A, B, C…), si l'exercice en fait partie. */
  supersetLabel?: string
  onActivate: () => void
  onCompleteSet: (set: SetEntry) => void
}

/**
 * Carte d'un exercice dans la séance en cours.
 * Les exercices isométriques (`type === 'time'`) affichent une colonne
 * « maintien (s) » au lieu d'une colonne répétitions.
 */
export function SessionExerciseCard({
  sessionExercise,
  exercise,
  index,
  active,
  supersetLabel,
  onActivate,
  onCompleteSet,
}: Props) {
  const { state, addSet, updateSet, removeSet, removeExerciseFromSession, setExerciseNotes } =
    useData()

  const isTime = exercise.type === 'time'
  const previous = lastPerformance(state.sessions, exercise.id)
  const doneCount = sessionExercise.sets.filter((s) => s.completed).length
  const allDone = doneCount === sessionExercise.sets.length && doneCount > 0

  return (
    <section
      id={`exercise-${sessionExercise.id}`}
      className={cx(
        'card scroll-mt-4 transition-colors',
        active ? 'border-steel/60 shadow-halo' : 'border-concrete-600',
        allDone && !active && 'opacity-70',
      )}
    >
      {/* En-tête de la carte */}
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-start gap-3 px-4 pt-4 text-left"
      >
        <span className="num mt-1 shrink-0 text-xs text-locked">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl leading-none">{exercise.name}</h2>
            {supersetLabel && (
              <span className="chip border-ember/40 bg-ember/15 text-ember">
                <IconLink size={11} /> Superset {supersetLabel}
              </span>
            )}
            {isTime && <span className="chip">Isométrique</span>}
          </div>
          <p className="mt-1 text-xs text-muted">
            {previous ? (
              <>
                Dernière fois ({formatRelativeDay(previous.date)}) ·{' '}
                <span className="num">
                  {previous.sets
                    .map((s) => `${setValue(s)}${isTime ? 's' : ''}`)
                    .join(' · ')}
                </span>
                {sessionExercise.restSeconds ? (
                  <>
                    {' '}· repos <span className="num">{sessionExercise.restSeconds}s</span>
                  </>
                ) : null}
              </>
            ) : (
              'Première fois sur cet exercice'
            )}
          </p>
        </div>
        <span
          className={cx(
            'num shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            allDone ? 'bg-moss/20 text-moss' : 'bg-concrete-700 text-muted',
          )}
        >
          {doneCount}/{sessionExercise.sets.length}
        </span>
      </button>

      {/* Tableau des séries */}
      <div className="px-4 pb-4 pt-3">
        <div
          className={cx(
            'grid items-center gap-2 pb-1.5',
            'grid-cols-[1.75rem_1fr_1fr_1fr_2.5rem]',
          )}
        >
          <span className="label-xs">Sér.</span>
          <span className="label-xs">Lest (kg)</span>
          <span className="label-xs">{isTime ? 'Maintien (s)' : 'Reps'}</span>
          <span className="label-xs">Tempo</span>
          <span className="label-xs text-right">OK</span>
        </div>

        <ul className="space-y-2">
          {sessionExercise.sets.map((set, i) => (
            <li
              key={set.id}
              className="grid grid-cols-[1.75rem_1fr_1fr_1fr_2.5rem] items-center gap-2"
            >
              <span className="num text-sm text-muted">{i + 1}</span>

              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={set.weight}
                aria-label={`Série ${i + 1}, lest en kilogrammes`}
                onChange={(e) =>
                  updateSet(sessionExercise.id, set.id, {
                    weight: Number(e.target.value) || 0,
                  })
                }
                className={cx('field py-2 text-center', set.completed && 'border-moss/40')}
              />

              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={isTime ? (set.seconds ?? '') : (set.reps ?? '')}
                aria-label={`Série ${i + 1}, ${isTime ? 'secondes de maintien' : 'répétitions'}`}
                onChange={(e) => {
                  const n = e.target.value === '' ? undefined : Number(e.target.value)
                  updateSet(
                    sessionExercise.id,
                    set.id,
                    isTime ? { seconds: n } : { reps: n },
                  )
                }}
                className={cx('field py-2 text-center', set.completed && 'border-moss/40')}
              />

              <input
                type="text"
                value={set.tempo ?? ''}
                placeholder="—"
                aria-label={`Série ${i + 1}, tempo`}
                onChange={(e) =>
                  updateSet(sessionExercise.id, set.id, { tempo: e.target.value })
                }
                className={cx(
                  'field py-2 text-center text-sm',
                  set.completed && 'border-moss/40',
                )}
              />

              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  aria-pressed={set.completed}
                  aria-label={`Valider la série ${i + 1}`}
                  onClick={() => {
                    const next = !set.completed
                    updateSet(sessionExercise.id, set.id, { completed: next })
                    if (next) onCompleteSet(set)
                  }}
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-soft border transition-colors',
                    set.completed
                      ? 'border-moss bg-moss text-concrete-900'
                      : 'border-concrete-600 bg-concrete-900/60 text-locked hover:border-steel hover:text-steel',
                  )}
                >
                  <IconCheck size={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => addSet(sessionExercise.id)}
            className="btn-ghost flex-1 py-2 text-xs"
          >
            <IconPlus size={14} /> Ajouter une série
          </button>
          {sessionExercise.sets.length > 1 && (
            <button
              type="button"
              onClick={() =>
                removeSet(
                  sessionExercise.id,
                  sessionExercise.sets[sessionExercise.sets.length - 1].id,
                )
              }
              className="btn-ghost px-3 py-2 text-xs text-muted"
              aria-label="Retirer la dernière série"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        {active && (
          <input
            type="text"
            value={sessionExercise.notes ?? ''}
            onChange={(e) => setExerciseNotes(sessionExercise.id, e.target.value)}
            placeholder="Note libre (sensation, douleur, réglage…)"
            aria-label="Note sur cet exercice"
            className="field mt-3 font-sans text-sm"
          />
        )}

        {active && (
          <button
            type="button"
            onClick={() => removeExerciseFromSession(sessionExercise.id)}
            className="mt-3 text-xs text-muted underline-offset-2 hover:text-ember hover:underline"
          >
            Retirer cet exercice de la séance
          </button>
        )}
      </div>
    </section>
  )
}
