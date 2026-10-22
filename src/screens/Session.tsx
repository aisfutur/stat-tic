import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { getExercise } from '../data/exercises'
import { SessionExerciseCard } from '../components/SessionExerciseCard'
import { ExercisePicker } from '../components/ExercisePicker'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { IconClock, IconPlay, IconPlus, IconX } from '../components/Icons'
import { useCountdown, useElapsed } from '../hooks/useTimers'
import { cx, formatDuration, formatShortDuration } from '../lib/utils'

export function Session() {
  const navigate = useNavigate()
  const {
    state,
    routines,
    activeRoutine,
    startSession,
    cancelSession,
    finishSession,
    addExerciseToSession,
  } = useData()
  const session = state.activeSession

  const [activeId, setActiveId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  const elapsed = useElapsed(session?.startedAt)
  const timer = useCountdown()

  /** Lettres de superset (A, B…) attribuées par groupe. */
  const supersetLabels = useMemo(() => {
    const labels = new Map<string, string>()
    let next = 0
    for (const ex of session?.exercises ?? []) {
      if (ex.supersetGroup && !labels.has(ex.supersetGroup)) {
        labels.set(ex.supersetGroup, String.fromCharCode(65 + next++))
      }
    }
    return labels
  }, [session?.exercises])

  // Exercice courant : celui choisi, sinon le premier non terminé.
  const currentExerciseId =
    activeId ??
    session?.exercises.find((ex) => ex.sets.some((s) => !s.completed))?.id ??
    session?.exercises[0]?.id ??
    null

  const totalSets = session?.exercises.reduce((a, ex) => a + ex.sets.length, 0) ?? 0
  const doneSets =
    session?.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.completed).length, 0) ?? 0

  // ── Aucune séance en cours ────────────────────────────────────────
  if (!session) {
    return (
      <>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
          <span
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full
              bg-concrete-800 text-steel"
            aria-hidden="true"
          >
            <IconPlay size={28} />
          </span>
          <h1 className="text-3xl">Aucune séance en cours</h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Lance ta routine active ou pars sur une séance libre : tu ajoutes les exercices
            au fur et à mesure.
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            {activeRoutine && (
              <button
                type="button"
                onClick={() => startSession(activeRoutine.id)}
                className="btn-primary"
              >
                <IconPlay size={16} /> {activeRoutine.name}
              </button>
            )}
            <button type="button" onClick={() => setStartOpen(true)} className="btn-ghost">
              Choisir une routine
            </button>
            <button
              type="button"
              onClick={() => startSession(undefined, 'Séance libre')}
              className="btn-ghost"
            >
              Séance libre
            </button>
          </div>
        </div>

        <Sheet open={startOpen} title="Choisir une routine" onClose={() => setStartOpen(false)}>
          <ul className="space-y-2">
            {routines.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    startSession(r.id)
                    setStartOpen(false)
                  }}
                  className="w-full rounded-soft border border-concrete-600 bg-concrete-700/40 px-4 py-3
                    text-left transition-colors hover:border-steel/50 hover:bg-concrete-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg leading-tight">{r.name}</p>
                      <p className="text-xs text-muted">
                        {r.track} · niveau <span className="num">{r.level}</span>
                      </p>
                    </div>
                    <span className="num shrink-0 text-xs text-muted">
                      {r.exercises.length} ex · ~{r.estimatedMinutes}′
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      </>
    )
  }

  // ── Séance en cours ───────────────────────────────────────────────
  function handleCompleteSet(sessionExerciseId: string) {
    const exIndex = session!.exercises.findIndex((e) => e.id === sessionExerciseId)
    const current = session!.exercises[exIndex]
    if (!current) return

    const group = current.supersetGroup
    const nextInGroup =
      group !== undefined
        ? session!.exercises
            .slice(exIndex + 1)
            .find((e) => e.supersetGroup === group && e.sets.some((s) => !s.completed))
        : undefined

    // Dans un superset, on enchaîne sans repos : on bascule simplement
    // sur l'exercice suivant du groupe.
    if (nextInGroup) {
      setActiveId(nextInGroup.id)
      return
    }

    const nextExercise = session!.exercises
      .slice(exIndex + 1)
      .find((e) => e.sets.some((s) => !s.completed))
    const remainingHere = current.sets.filter((s) => !s.completed).length > 1

    const label = remainingHere
      ? `${getExercise(current.exerciseId)?.name} · série suivante`
      : nextExercise
        ? getExercise(nextExercise.exerciseId)?.name
        : 'Dernière série terminée'

    if (current.restSeconds && current.restSeconds > 0) {
      timer.start(current.restSeconds, label)
    }
    if (!remainingHere && nextExercise) setActiveId(nextExercise.id)
  }

  function handleFinish() {
    timer.stop()
    const saved = finishSession()
    navigate(saved ? '/historique' : '/')
  }

  return (
    <div className="space-y-4">
      {/* En-tête de séance */}
      <header className="sticky top-0 z-20 -mx-4 bg-concrete-900/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmQuit(true)}
            className="flex items-center gap-1.5 rounded-soft px-2 py-2 text-xs font-semibold
              text-muted hover:bg-concrete-800 hover:text-chalk"
          >
            <IconX size={16} /> Quitter
          </button>

          <div className="text-center">
            <p className="num text-2xl font-bold leading-none text-chalk">
              {formatDuration(elapsed)}
            </p>
            <p className="label-xs mt-0.5">
              <span className="num">{doneSets}</span>/
              <span className="num">{totalSets}</span> séries
            </p>
          </div>

          <button type="button" onClick={handleFinish} className="btn-primary px-4 py-2 text-xs">
            Terminer
          </button>
        </div>

        {/* Barre de progression des séries */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-concrete-700">
          <div
            className="h-full rounded-full bg-steel transition-all"
            style={{ width: totalSets ? `${(doneSets / totalSets) * 100}%` : '0%' }}
          />
        </div>
      </header>

      <div>
        <h1 className="text-3xl leading-none">{session.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <IconClock size={13} />
          <span className="num">{formatShortDuration(elapsed)}</span> écoulées
        </p>
      </div>

      {/* Exercices */}
      {session.exercises.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          Séance vide. Ajoute ton premier exercice ci-dessous.
        </p>
      ) : (
        <div className="space-y-3">
          {session.exercises.map((sex, i) => {
            const exercise = getExercise(sex.exerciseId)
            if (!exercise) return null
            return (
              <SessionExerciseCard
                key={sex.id}
                sessionExercise={sex}
                exercise={exercise}
                index={i}
                active={sex.id === currentExerciseId}
                supersetLabel={
                  sex.supersetGroup ? supersetLabels.get(sex.supersetGroup) : undefined
                }
                onActivate={() => setActiveId(sex.id)}
                onCompleteSet={() => handleCompleteSet(sex.id)}
              />
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cx('btn-ghost w-full border-dashed', timer.running && 'mb-24')}
      >
        <IconPlus size={16} /> Ajouter un exercice
      </button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExerciseToSession}
      />

      <RestTimer timer={timer} />

      <Sheet
        open={confirmQuit}
        title="Quitter la séance ?"
        onClose={() => setConfirmQuit(false)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmQuit(false)
                handleFinish()
              }}
              className="btn-primary"
            >
              Enregistrer et quitter
            </button>
            <button
              type="button"
              onClick={() => {
                timer.stop()
                cancelSession()
                setConfirmQuit(false)
                navigate('/')
              }}
              className="btn-ghost text-ember"
            >
              Abandonner sans enregistrer
            </button>
            <button
              type="button"
              onClick={() => setConfirmQuit(false)}
              className="btn-ghost"
            >
              Continuer la séance
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          <span className="num text-chalk">{doneSets}</span> série
          {doneSets > 1 ? 's' : ''} validée{doneSets > 1 ? 's' : ''} en{' '}
          <span className="num text-chalk">{formatShortDuration(elapsed)}</span>. En
          enregistrant, seules les séries cochées sont conservées.
        </p>
      </Sheet>
    </div>
  )

}
