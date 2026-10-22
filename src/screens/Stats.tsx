import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../hooks/useData'
import { useThemeColors } from '../hooks/useTheme'
import { getExercise } from '../data/exercises'
import { Heatmap } from '../components/Heatmap'
import { Sheet } from '../components/Sheet'
import { IconChevron } from '../components/Icons'
import {
  computeLongestStreak,
  computeStreak,
  exerciseChartData,
  globalTotals,
  loggedExerciseIds,
  pushPullBalance,
} from '../lib/stats'
import { cx, formatShortDate, formatShortDuration } from '../lib/utils'

export function Stats() {
  const { state, setFavoriteChartExercise } = useData()
  // Recharts attend des couleurs, pas des classes : on les relit dans le thème.
  const colors = useThemeColors()
  const sessions = state.sessions
  const [pickerOpen, setPickerOpen] = useState(false)

  const chartExerciseId = state.settings.favoriteChartExerciseId ?? 'ex-pullup'
  const chartExercise = getExercise(chartExerciseId)
  const isTime = chartExercise?.type === 'time'

  const chartData = useMemo(
    () =>
      exerciseChartData(sessions, chartExerciseId).map((p) => ({
        ...p,
        label: formatShortDate(p.date),
      })),
    [sessions, chartExerciseId],
  )

  const delta =
    chartData.length >= 2 ? chartData[chartData.length - 1].value - chartData[0].value : 0

  const balance = pushPullBalance(sessions)
  const totals = globalTotals(sessions)
  const streak = computeStreak(sessions)
  const longest = computeLongestStreak(sessions)

  const available = useMemo(
    () =>
      loggedExerciseIds(sessions)
        .map((id) => getExercise(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sessions],
  )

  const donutData = [
    { name: 'Pousser', value: balance.push, color: colors.ember },
    { name: 'Tirer', value: balance.pull, color: colors.steel },
  ]

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl">Pas encore de données</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Logge une première séance : les courbes, le ratio pousser/tirer et la heatmap
          apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-4xl leading-none">Statistiques</h1>
        <p className="mt-1 text-sm text-muted">
          <span className="num">{totals.sessionCount}</span> séances ·{' '}
          <span className="num">{formatShortDuration(totals.totalSeconds)}</span> cumulées
        </p>
      </header>

      {/* Totaux */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Streak actuel', value: streak, unit: 'j', accent: 'text-ember' },
          { label: 'Record de streak', value: longest, unit: 'j', accent: 'text-chalk' },
          { label: 'Séries totales', value: totals.totalSets, unit: '', accent: 'text-chalk' },
          {
            label: 'Durée moyenne',
            value: Math.round(totals.avgSeconds / 60),
            unit: 'min',
            accent: 'text-chalk',
          },
        ].map((s) => (
          <div key={s.label} className="card p-3">
            <p className={cx('num text-2xl font-bold leading-none', s.accent)}>
              {s.value}
              {s.unit && <span className="ml-0.5 text-xs text-muted">{s.unit}</span>}
            </p>
            <p className="label-xs mt-1.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Courbe d'évolution */}
      <section className="card p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl leading-none">Évolution</h2>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-1 flex items-center gap-1 text-sm text-steel hover:underline"
            >
              {chartExercise?.name ?? 'Choisir un exercice'}
              <IconChevron size={14} />
            </button>
          </div>
          {chartData.length >= 2 && (
            <div className="text-right">
              <p
                className={cx(
                  'num text-2xl font-bold leading-none',
                  delta > 0 ? 'text-moss' : delta < 0 ? 'text-ember' : 'text-muted',
                )}
              >
                {delta > 0 ? '+' : ''}
                {delta}
                <span className="ml-0.5 text-xs text-muted">{isTime ? 's' : 'reps'}</span>
              </p>
              <p className="label-xs mt-1">sur la période</p>
            </div>
          )}
        </div>

        {chartData.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted">
            Au moins deux séances avec cet exercice sont nécessaires pour tracer une courbe.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={colors.muted}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: colors.border }}
                  minTickGap={24}
                />
                <YAxis
                  stroke={colors.muted}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: colors.chalk,
                  }}
                  labelStyle={{ color: colors.muted }}
                  formatter={(value: number) => [
                    `${value} ${isTime ? 's' : 'reps'}`,
                    'Meilleure série',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.steel}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: colors.steel, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Ratio pousser / tirer */}
      <section className="card p-4">
        <h2 className="text-xl leading-none">Ratio pousser / tirer</h2>
        <p className="label-xs mt-1">8 dernières semaines</p>

        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-xl font-bold leading-none">
                {Math.round(balance.pushShare * 100)}
                <span className="text-xs text-muted">%</span>
              </span>
              <span className="label-xs mt-0.5">pousser</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ember" />
              <span className="flex-1 text-muted">Pousser</span>
              <span className="num text-chalk">{balance.push}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-steel" />
              <span className="flex-1 text-muted">Tirer</span>
              <span className="num text-chalk">{balance.pull}</span>
            </div>
            <p
              className={cx(
                'rounded-soft border px-3 py-2 text-xs leading-snug',
                balance.status === 'balanced'
                  ? 'border-moss/40 bg-moss/10 text-moss'
                  : balance.status === 'no-data'
                    ? 'border-concrete-600 bg-concrete-700/40 text-muted'
                    : 'border-ember/40 bg-ember/10 text-ember',
              )}
            >
              {balance.message}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-snug text-locked">
          Volume en répétitions ; les maintiens isométriques comptent 1 rep pour 3 secondes.
        </p>
      </section>

      {/* Heatmap */}
      <section className="card p-4">
        <h2 className="text-xl leading-none">Fréquence d’entraînement</h2>
        <p className="label-xs mb-3 mt-1">12 dernières semaines</p>
        <Heatmap sessions={sessions} />
      </section>

      {/* Sélecteur d'exercice pour la courbe */}
      <Sheet open={pickerOpen} title="Exercice suivi" onClose={() => setPickerOpen(false)}>
        <ul className="space-y-2">
          {available.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => {
                  setFavoriteChartExercise(ex.id)
                  setPickerOpen(false)
                }}
                className={cx(
                  'w-full rounded-soft border px-4 py-3 text-left transition-colors',
                  ex.id === chartExerciseId
                    ? 'border-steel bg-steel/15'
                    : 'border-concrete-600 bg-concrete-700/40 hover:bg-concrete-700',
                )}
              >
                <p className="font-display text-lg leading-tight">{ex.name}</p>
                <p className="text-xs text-muted">
                  {ex.type === 'time' ? 'Maintien (s)' : 'Répétitions'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
