import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Category, Routine, RoutineExercise } from '../types'
import { useData } from '../hooks/useData'
import { CATEGORY_LABEL, getExercise } from '../data/exercises'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import {
  IconCheck,
  IconClock,
  IconLink,
  IconLock,
  IconPlay,
  IconPlus,
  IconTrash,
} from '../components/Icons'
import { cx, uid } from '../lib/utils'

export function Routines() {
  const navigate = useNavigate()
  const {
    state,
    routines,
    activeRoutine,
    setActiveRoutine,
    startSession,
    deleteCustomRoutine,
  } = useData()

  const [detailId, setDetailId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  /** Pistes dans l'ordre d'apparition, routines triées par niveau. */
  const tracks = useMemo(() => {
    const map = new Map<string, Routine[]>()
    for (const r of routines) {
      const list = map.get(r.track) ?? []
      list.push(r)
      map.set(r.track, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.level - b.level)
    return [...map.entries()]
  }, [routines])

  const detail = routines.find((r) => r.id === detailId)

  /**
   * Un niveau est considéré « débloqué » s'il est ≤ au niveau de la routine
   * active dans la même piste, +1 pour laisser voir la marche suivante.
   */
  function unlockedLevel(track: string): number {
    const sameTrack = routines.filter((r) => r.track === track)
    const active = sameTrack.find((r) => r.id === state.activeRoutineId)
    const maxDone = active?.level ?? 1
    return maxDone + 1
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-none">Routines</h1>
          <p className="mt-1 text-sm text-muted">
            Des plans par niveaux. Le niveau actif alimente l’accueil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn-ghost shrink-0 px-3 py-2 text-xs"
        >
          <IconPlus size={14} /> Créer
        </button>
      </header>

      {tracks.map(([track, list]) => {
        const unlocked = unlockedLevel(track)
        return (
          <section key={track}>
            <h2 className="mb-3 text-2xl leading-none">{track}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((routine) => {
                const isActive = routine.id === activeRoutine?.id
                const locked = routine.level > unlocked
                // Progression vers le niveau suivant : part du niveau atteint.
                const pct = isActive
                  ? 45
                  : routine.level < unlocked - 1
                    ? 100
                    : routine.level < unlocked
                      ? 70
                      : 0

                return (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => setDetailId(routine.id)}
                    className={cx(
                      'card w-full p-4 text-left transition-colors',
                      isActive
                        ? 'border-steel/60 bg-concrete-700/60 shadow-halo'
                        : 'hover:bg-concrete-700/40',
                      locked && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-soft font-display text-xl',
                          isActive
                            ? 'bg-steel text-concrete-900'
                            : locked
                              ? 'bg-concrete-900 text-locked'
                              : 'bg-concrete-700 text-chalk',
                        )}
                      >
                        {locked ? <IconLock size={16} /> : routine.level}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-xl leading-tight">{routine.name}</p>
                          {isActive && (
                            <span className="chip border-steel/40 bg-steel/15 text-steel">
                              Actif
                            </span>
                          )}
                          {routine.custom && <span className="chip">Perso</span>}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="chip">
                            <span className="num">{routine.exercises.length}</span> ex.
                          </span>
                          <span className="chip">
                            <span className="num">{routine.frequencyPerWeek}</span>×/sem.
                          </span>
                          <span className="chip">
                            <IconClock size={11} />
                            <span className="num">~{routine.estimatedMinutes}′</span>
                          </span>
                          <span className="chip">{CATEGORY_LABEL[routine.category]}</span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <span className="label-xs">
                              {routine.level < 5
                                ? `Vers le niveau ${routine.level + 1}`
                                : 'Dernier niveau'}
                            </span>
                            <span className="num text-[10px] text-muted">{pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-concrete-900">
                            <div
                              className={cx(
                                'h-full rounded-full transition-all',
                                pct === 100 ? 'bg-moss' : 'bg-steel',
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Détail d'une routine */}
      <Sheet
        open={detail !== undefined}
        title={detail?.name ?? ''}
        onClose={() => setDetailId(null)}
        footer={
          detail && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  startSession(detail.id)
                  setDetailId(null)
                  navigate('/seance')
                }}
                className="btn-primary"
              >
                <IconPlay size={16} /> Démarrer cette séance
              </button>
              {detail.id !== activeRoutine?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoutine(detail.id)
                    setDetailId(null)
                  }}
                  className="btn-ghost"
                >
                  <IconCheck size={16} /> Définir comme routine active
                </button>
              )}
              {detail.custom && (
                <button
                  type="button"
                  onClick={() => {
                    deleteCustomRoutine(detail.id)
                    setDetailId(null)
                  }}
                  className="btn-ghost text-ember"
                >
                  <IconTrash size={16} /> Supprimer la routine
                </button>
              )}
            </div>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip">
                {detail.track} · niveau <span className="num">{detail.level}</span>
              </span>
              <span className="chip">
                <span className="num">{detail.frequencyPerWeek}</span>×/semaine
              </span>
              <span className="chip">
                <span className="num">~{detail.estimatedMinutes}</span> min
              </span>
            </div>

            <ul className="space-y-2">
              {detail.exercises.map((re, i) => {
                const ex = getExercise(re.exerciseId)
                return (
                  <li
                    key={`${re.exerciseId}-${i}`}
                    className="rounded-soft border border-concrete-600 bg-concrete-700/40 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-display text-lg leading-tight">
                          {ex?.name ?? re.exerciseId}
                          {re.supersetGroup && (
                            <span className="chip border-ember/40 bg-ember/15 text-ember">
                              <IconLink size={10} /> Superset
                            </span>
                          )}
                        </p>
                        <p className="num mt-0.5 text-xs text-muted">
                          {re.sets} ×{' '}
                          {ex?.type === 'time' ? `${re.targetSeconds} s` : `${re.targetReps} reps`}
                          {re.tempo ? ` · tempo ${re.tempo}` : ''}
                        </p>
                      </div>
                      <span className="num shrink-0 text-xs text-locked">
                        {re.restSeconds}s repos
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Sheet>

      <RoutineCreator open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

/** Formulaire de création d'une routine personnalisée. */
function RoutineCreator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCustomRoutine, setActiveRoutine } = useData()
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState(3)
  const [minutes, setMinutes] = useState(40)
  const [category, setCategory] = useState<Category>('push')
  const [items, setItems] = useState<RoutineExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setFrequency(3)
    setMinutes(40)
    setCategory('push')
    setItems([])
    setError(null)
  }

  function addItem(exerciseId: string) {
    const ex = getExercise(exerciseId)
    setItems((list) => [
      ...list,
      {
        exerciseId,
        sets: 3,
        ...(ex?.type === 'time' ? { targetSeconds: 20 } : { targetReps: 8 }),
        restSeconds: 90,
      },
    ])
  }

  function patchItem(index: number, patch: Partial<RoutineExercise>) {
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  /**
   * Rattache (ou détache) un exercice au superset de celui qui le précède :
   * les deux doivent partager la même clé de groupe.
   */
  function toggleSuperset(index: number, checked: boolean) {
    setItems((list) => {
      if (!checked) {
        return list.map((it, i) => (i === index ? { ...it, supersetGroup: undefined } : it))
      }
      const previous = list[index - 1]
      if (!previous) return list
      const group = previous.supersetGroup ?? uid('sup')
      return list.map((it, i) => {
        if (i === index - 1) return { ...it, supersetGroup: group }
        if (i === index) return { ...it, supersetGroup: group }
        return it
      })
    })
  }

  function submit() {
    if (!name.trim()) {
      setError('Donne un nom à ta routine.')
      return
    }
    if (items.length === 0) {
      setError('Ajoute au moins un exercice.')
      return
    }
    const created = addCustomRoutine({
      name: name.trim(),
      level: 1,
      track: 'Mes routines',
      category,
      exercises: items,
      frequencyPerWeek: frequency,
      estimatedMinutes: minutes,
    })
    setActiveRoutine(created.id)
    reset()
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        title="Nouvelle routine"
        onClose={() => {
          reset()
          onClose()
        }}
        footer={
          <div className="space-y-2">
            {error && <p className="text-xs text-ember">{error}</p>}
            <button type="button" onClick={submit} className="btn-primary w-full">
              Créer la routine
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="rt-name" className="label-xs mb-1 block">
              Nom
            </label>
            <input
              id="rt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Haut du corps — mardi"
              className="field font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rt-freq" className="label-xs mb-1 block">
                Séances / semaine
              </label>
              <input
                id="rt-freq"
                type="number"
                min={1}
                max={7}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) || 1)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="rt-min" className="label-xs mb-1 block">
                Durée (min)
              </label>
              <input
                id="rt-min"
                type="number"
                min={5}
                max={180}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 5)}
                className="field"
              />
            </div>
          </div>

          <div>
            <span className="label-xs mb-1 block">Dominante</span>
            <div className="flex flex-wrap gap-2">
              {(['push', 'pull', 'legs', 'core', 'mobility'] as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cx(
                    'chip',
                    category === c && 'border-steel bg-steel/20 text-steel',
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label-xs">Exercices</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs font-semibold text-steel hover:underline"
              >
                + Ajouter
              </button>
            </div>

            {items.length === 0 ? (
              <p className="rounded-soft border border-dashed border-concrete-600 p-4 text-center text-xs text-muted">
                Aucun exercice pour l’instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((it, i) => {
                  const ex = getExercise(it.exerciseId)
                  const isTime = ex?.type === 'time'
                  return (
                    <li
                      key={`${it.exerciseId}-${i}`}
                      className="rounded-soft border border-concrete-600 bg-concrete-700/40 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-display text-base">{ex?.name}</p>
                        <button
                          type="button"
                          onClick={() => setItems((l) => l.filter((_, idx) => idx !== i))}
                          className="shrink-0 text-muted hover:text-ember"
                          aria-label={`Retirer ${ex?.name}`}
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="label-xs">Séries</span>
                          <input
                            type="number"
                            min={1}
                            value={it.sets}
                            onChange={(e) =>
                              patchItem(i, { sets: Number(e.target.value) || 1 })
                            }
                            className="field mt-0.5 py-1.5 text-center text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="label-xs">{isTime ? 'Sec.' : 'Reps'}</span>
                          <input
                            type="number"
                            min={1}
                            value={isTime ? (it.targetSeconds ?? 20) : (it.targetReps ?? 8)}
                            onChange={(e) => {
                              const n = Number(e.target.value) || 1
                              patchItem(i, isTime ? { targetSeconds: n } : { targetReps: n })
                            }}
                            className="field mt-0.5 py-1.5 text-center text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="label-xs">Repos</span>
                          <input
                            type="number"
                            min={0}
                            step={15}
                            value={it.restSeconds}
                            onChange={(e) =>
                              patchItem(i, { restSeconds: Number(e.target.value) || 0 })
                            }
                            className="field mt-0.5 py-1.5 text-center text-sm"
                          />
                        </label>
                      </div>
                      {i > 0 && (
                        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={it.supersetGroup !== undefined}
                            onChange={(e) => toggleSuperset(i, e.target.checked)}
                            className="h-4 w-4 accent-ember"
                          />
                          Enchaîner sans repos avec l’exercice précédent
                        </label>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </Sheet>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addItem}
        title="Ajouter à la routine"
      />
    </>
  )
}
