import { trainingHeatmap } from '../lib/stats'
import type { Session } from '../types'
import { cx, fromDayKey } from '../lib/utils'

const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']

/** Intensité de la case selon le nombre de séances du jour. */
function cellClass(count: number, future: boolean): string {
  if (future) return 'bg-concrete-900/40 border border-concrete-800'
  if (count === 0) return 'bg-concrete-800 border border-concrete-700/60'
  if (count === 1) return 'bg-moss/45'
  if (count === 2) return 'bg-moss/75'
  return 'bg-moss'
}

/** Calendrier de fréquence sur 12 semaines, façon graphe de contributions. */
export function Heatmap({ sessions, weeks = 12 }: { sessions: Session[]; weeks?: number }) {
  const grid = trainingHeatmap(sessions, weeks)

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1">
          {grid.map((week) => {
            const monthStart = fromDayKey(week.weekStart).getDate() <= 7
            return (
              <div key={week.weekStart} className="flex flex-col gap-1">
                <span className="h-3 text-[9px] leading-3 text-locked">
                  {monthStart ? MONTHS[fromDayKey(week.weekStart).getMonth()] : ''}
                </span>
                {week.days.map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date} · ${day.count} séance${day.count > 1 ? 's' : ''}`}
                    className={cx('h-3.5 w-3.5 rounded-[3px]', cellClass(day.count, day.future))}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
        <span>Moins</span>
        <span className="h-3 w-3 rounded-[3px] border border-concrete-700/60 bg-concrete-800" />
        <span className="h-3 w-3 rounded-[3px] bg-moss/45" />
        <span className="h-3 w-3 rounded-[3px] bg-moss/75" />
        <span className="h-3 w-3 rounded-[3px] bg-moss" />
        <span>Plus</span>
      </div>
    </div>
  )
}
