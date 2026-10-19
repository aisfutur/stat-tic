import { formatDuration } from '../lib/utils'
import type { Countdown } from '../hooks/useTimers'
import { IconPlus, IconX } from './Icons'

const SIZE = 72
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Bloc de repos : minuteur circulaire décomptant, nom de la prochaine
 * série, et raccourcis +30 s / passer.
 */
export function RestTimer({ timer }: { timer: Countdown }) {
  if (!timer.running) return null

  const ratio = timer.total > 0 ? timer.remaining / timer.total : 0

  return (
    <div
      role="status"
      aria-live="off"
      className="fixed inset-x-0 bottom-16 z-30 animate-slide-up px-4 pb-2"
    >
      <div
        className="mx-auto flex max-w-3xl items-center gap-4 rounded-card border border-steel/40
          bg-concrete-700 p-3 shadow-lift lg:max-w-5xl"
      >
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#4A4E4F"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#6E9BC7"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              style={{ transition: 'stroke-dashoffset 250ms linear' }}
            />
          </svg>
          <span className="num absolute inset-0 flex items-center justify-center text-base font-bold text-chalk">
            {formatDuration(timer.remaining)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="label-xs">Repos</p>
          <p className="truncate font-display text-xl leading-tight text-chalk">
            {timer.label ?? 'Prochaine série'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => timer.add(30)}
            className="btn-ghost num px-3 py-2 text-xs"
            aria-label="Ajouter 30 secondes de repos"
          >
            <IconPlus size={14} /> 30s
          </button>
          <button
            type="button"
            onClick={timer.stop}
            className="btn-ghost px-3 py-2 text-xs"
            aria-label="Passer le repos"
          >
            <IconX size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
