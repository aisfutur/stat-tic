import type { ProgressionPath } from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import { IconCheck, IconLock } from './Icons'
import { cx } from '../lib/utils'

export type RungState = 'done' | 'current' | 'locked'

export function rungState(index: number, currentStep: number): RungState {
  if (index < currentStep) return 'done'
  if (index === currentStep) return 'current'
  return 'locked'
}

/** Nœud de l'échelle : plein (acquis), contour halo (en cours), cadenas (verrouillé). */
function Rung({ state, step, size = 'md' }: { state: RungState; step: number; size?: 'md' | 'sm' }) {
  const dim = size === 'md' ? 'h-11 w-11' : 'h-6 w-6'

  if (state === 'done') {
    return (
      <span
        className={cx(
          dim,
          'flex shrink-0 items-center justify-center rounded-full bg-moss text-concrete-900',
        )}
      >
        <IconCheck size={size === 'md' ? 20 : 13} />
      </span>
    )
  }

  if (state === 'current') {
    return (
      <span
        className={cx(
          dim,
          'flex shrink-0 items-center justify-center rounded-full border-2 border-steel',
          'bg-concrete-900 font-mono font-bold text-steel animate-pulse-halo',
          size === 'md' ? 'text-sm' : 'text-[10px]',
        )}
      >
        {step}
      </span>
    )
  }

  return (
    <span
      className={cx(
        dim,
        'flex shrink-0 items-center justify-center rounded-full border border-locked bg-concrete-800 text-locked',
      )}
    >
      <IconLock size={size === 'md' ? 16 : 11} />
    </span>
  )
}

interface LadderProps {
  path: ProgressionPath
  currentStep: number
  onSelectStep?: (index: number) => void
}

/**
 * Échelle de progression complète : rail pointillé vertical,
 * un barreau par étape avec son objectif chiffré.
 */
export function ProgressionLadder({ path, currentStep, onSelectStep }: LadderProps) {
  return (
    <ol className="relative">
      {path.steps.map((step, i) => {
        const exercise = EXERCISE_BY_ID[step.exerciseId]
        const state = rungState(i, currentStep)
        const isLast = i === path.steps.length - 1

        return (
          <li key={step.exerciseId} className="relative flex gap-4 pb-3 last:pb-0">
            {/* Colonne rail + nœud */}
            <div className="relative flex w-11 shrink-0 flex-col items-center">
              <Rung state={state} step={i + 1} />
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cx(
                    'mt-1 w-[2px] flex-1 ladder-rail',
                    state === 'done' && 'ladder-rail-done',
                  )}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectStep?.(i)}
              disabled={!onSelectStep}
              className={cx(
                'mb-1 flex-1 rounded-soft border px-4 py-3 text-left transition-colors',
                onSelectStep && 'hover:bg-concrete-700/60',
                state === 'current'
                  ? 'border-steel/60 bg-concrete-700/70 shadow-halo'
                  : 'border-concrete-600 bg-concrete-800',
                state === 'locked' && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cx(
                      'font-display text-lg leading-tight',
                      state === 'locked' ? 'text-muted' : 'text-chalk',
                    )}
                  >
                    {exercise?.name ?? step.exerciseId}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted">
                    Objectif · {step.criterion.label}
                  </p>
                </div>
                <StatusBadge state={state} />
              </div>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function StatusBadge({ state }: { state: RungState }) {
  const map: Record<RungState, { label: string; className: string }> = {
    done: { label: 'Acquis', className: 'border-moss/40 bg-moss/15 text-moss' },
    current: { label: 'En cours', className: 'border-steel/40 bg-steel/15 text-steel' },
    locked: { label: 'Verrouillé', className: 'border-locked bg-concrete-900 text-locked' },
  }
  const { label, className } = map[state]
  return <span className={cx('chip shrink-0', className)}>{label}</span>
}

/**
 * Miniature de l'échelle, réutilisée sur l'accueil : même motif
 * (nœuds + rail pointillé) mais à l'horizontale pour tenir dans une carte.
 */
export function MiniLadder({
  path,
  currentStep,
  className,
}: {
  path: ProgressionPath
  currentStep: number
  className?: string
}) {
  return (
    <div className={cx('flex items-center', className)} aria-hidden="true">
      {path.steps.map((step, i) => {
        const state = rungState(i, currentStep)
        return (
          <div key={step.exerciseId} className="flex items-center">
            <Rung state={state} step={i + 1} size="sm" />
            {i < path.steps.length - 1 && (
              <span
                className={cx(
                  'mx-1 h-[2px] w-4 rounded-full',
                  state === 'done' ? 'bg-moss' : 'bg-locked',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
