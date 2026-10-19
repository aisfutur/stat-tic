import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { PROGRESSION_BY_ID } from '../data/progressions'
import { EXERCISE_BY_ID } from '../data/exercises'
import { MiniLadder } from '../components/ProgressionLadder'
import {
  IconChevron,
  IconClock,
  IconFlame,
  IconHistory,
  IconPlay,
  IconSettings,
} from '../components/Icons'
import {
  computeStreak,
  currentWeekDays,
  personalRecord,
} from '../lib/stats'
import {
  WEEKDAY_INITIALS,
  cx,
  formatLongDate,
  formatRelativeDay,
  formatShortDuration,
  fromDayKey,
} from '../lib/utils'

export function Home() {
  const navigate = useNavigate()
  const { state, activeRoutine, progressFor, startSession } = useData()
  const { sessions, activeSession } = state

  const streak = computeStreak(sessions)
  const week = currentWeekDays(sessions)
  const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]

  const quickStats = [
    { exerciseId: 'ex-pullup', label: 'Max tractions', unit: 'reps' },
    { exerciseId: 'ex-tuck-planche', label: 'Planche groupée', unit: 's' },
    { exerciseId: 'ex-pistol-squat', label: 'Pistol / jambe', unit: 'reps' },
  ].map((s) => ({ ...s, value: personalRecord(sessions, s.exerciseId) }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  function onStart() {
    if (!activeSession) startSession(activeRoutine?.id)
    navigate('/seance')
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatLongDate(new Date())}</p>
          <h1 className="text-4xl leading-none">
            {greeting}, {state.settings.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/historique"
            className="rounded-full p-2 text-muted hover:bg-concrete-800 hover:text-chalk"
            aria-label="Historique des séances"
          >
            <IconHistory size={20} />
          </Link>
          <Link
            to="/reglages"
            className="rounded-full p-2 text-muted hover:bg-concrete-800 hover:text-chalk"
            aria-label="Réglages"
          >
            <IconSettings size={20} />
          </Link>
        </div>
      </header>

      {/* Streak + semaine */}
      <section className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full
                bg-ember/15 text-ember"
              aria-hidden="true"
            >
              <IconFlame size={24} />
            </span>
            <div>
              <p className="num text-3xl font-bold leading-none text-ember">{streak}</p>
              <p className="label-xs mt-1">
                {streak === 1 ? 'jour d’affilée' : 'jours d’affilée'}
              </p>
            </div>
          </div>

          <ul className="flex gap-1.5" aria-label="Séances de la semaine">
            {week.map((day, i) => (
              <li key={day.date}>
                <div
                  title={day.date}
                  className={cx(
                    'flex h-10 w-8 flex-col items-center justify-center rounded-soft border text-[10px] font-semibold',
                    day.trained
                      ? 'border-moss/50 bg-moss/20 text-moss'
                      : day.future
                        ? 'border-concrete-600 bg-concrete-900/60 text-locked'
                        : 'border-concrete-600 bg-concrete-900/60 text-muted',
                    day.isToday && 'ring-2 ring-steel ring-offset-2 ring-offset-concrete-800',
                  )}
                >
                  <span>{WEEKDAY_INITIALS[i]}</span>
                  <span className="num text-[11px]">{fromDayKey(day.date).getDate()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Séance en cours à reprendre */}
      {activeSession && (
        <Link
          to="/seance"
          className="flex items-center justify-between gap-3 rounded-card border border-ember/50
            bg-ember/10 p-4 transition-colors hover:bg-ember/15"
        >
          <div>
            <p className="label-xs text-ember">Séance en cours</p>
            <p className="font-display text-2xl leading-tight">{activeSession.name}</p>
          </div>
          <IconChevron size={22} className="shrink-0 text-ember" />
        </Link>
      )}

      {/* Séance du jour */}
      <section className="card overflow-hidden">
        <div className="border-b border-concrete-600 bg-concrete-700/40 px-4 py-2">
          <p className="label-xs">Séance du jour</p>
        </div>
        <div className="p-4">
          {activeRoutine ? (
            <>
              <h2 className="text-3xl leading-none">{activeRoutine.name}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip">
                  <span className="num">{activeRoutine.exercises.length}</span> exercices
                </span>
                <span className="chip">
                  <IconClock size={12} />
                  <span className="num">~{activeRoutine.estimatedMinutes} min</span>
                </span>
                <span className="chip">
                  Niveau <span className="num">{activeRoutine.level}</span>
                </span>
                <span className="chip">
                  <span className="num">{activeRoutine.frequencyPerWeek}</span>×/sem.
                </span>
              </div>

              <ul className="mt-4 space-y-1.5">
                {activeRoutine.exercises.slice(0, 4).map((re, i) => {
                  const ex = EXERCISE_BY_ID[re.exerciseId]
                  return (
                    <li key={`${re.exerciseId}-${i}`} className="flex items-baseline gap-2 text-sm">
                      <span className="num w-5 shrink-0 text-xs text-locked">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-chalk">{ex?.name}</span>
                      <span className="num shrink-0 text-xs text-muted">
                        {re.sets} ×{' '}
                        {ex?.type === 'time' ? `${re.targetSeconds}s` : re.targetReps}
                      </span>
                    </li>
                  )
                })}
                {activeRoutine.exercises.length > 4 && (
                  <li className="pl-7 text-xs text-muted">
                    + {activeRoutine.exercises.length - 4} autres
                  </li>
                )}
              </ul>

              {lastSession && (
                <p className="mt-4 text-xs text-muted">
                  Dernière séance · {formatRelativeDay(lastSession.date)}
                  {lastSession.durationSeconds
                    ? ` · ${formatShortDuration(lastSession.durationSeconds)}`
                    : ''}
                </p>
              )}

              <button type="button" onClick={onStart} className="btn-primary mt-4 w-full">
                <IconPlay size={16} />
                {activeSession ? 'Reprendre la séance' : 'Commencer la séance'}
              </button>
            </>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted">
                Aucune routine active. Choisis-en une dans l’onglet Routines, ou lance une
                séance libre.
              </p>
              <button type="button" onClick={onStart} className="btn-primary mt-4 w-full">
                <IconPlay size={16} /> Séance libre
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Stats rapides */}
      <section>
        <h2 className="mb-2 text-xl">Records</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickStats.map((s) => {
            const ex = EXERCISE_BY_ID[s.exerciseId]
            return (
              <div key={s.exerciseId} className="card p-3">
                <p className="num text-2xl font-bold leading-none text-chalk">
                  {s.value || '—'}
                  {s.value ? <span className="ml-0.5 text-xs text-muted">{s.unit}</span> : null}
                </p>
                <p className="label-xs mt-1.5 leading-tight">{s.label}</p>
                <p className="mt-0.5 truncate text-[10px] text-locked">{ex?.name}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Aperçu des progressions, en reprenant le motif d'échelle */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl">Progressions</h2>
          <Link to="/progressions" className="text-xs font-semibold text-steel hover:underline">
            Tout voir
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {['prog-pullup', 'prog-pushup', 'prog-planche', 'prog-frontlever'].map((pathId) => {
            const path = PROGRESSION_BY_ID[pathId]
            const progress = progressFor(pathId)
            const step = path.steps[Math.min(progress.currentStep, path.steps.length - 1)]
            return (
              <Link
                key={pathId}
                to="/progressions"
                className="card flex flex-col gap-2.5 p-4 transition-colors hover:bg-concrete-700/50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-lg leading-none">{path.name}</p>
                  <span className="num shrink-0 text-xs text-muted">
                    {progress.currentStep + 1}/{path.steps.length}
                  </span>
                </div>
                <MiniLadder path={path} currentStep={progress.currentStep} />
                <p className="truncate text-xs text-muted">
                  {EXERCISE_BY_ID[step.exerciseId]?.name} ·{' '}
                  <span className="num">{step.criterion.label}</span>
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
