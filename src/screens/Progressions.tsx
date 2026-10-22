import { useMemo, useState } from 'react'
import type { Category } from '../types'
import { useData } from '../hooks/useData'
import { PROGRESSIONS } from '../data/progressions'
import { CATEGORY_LABEL, getExercise } from '../data/exercises'
import { ProgressionLadder, StatusBadge, rungState } from '../components/ProgressionLadder'
import { Sheet } from '../components/Sheet'
import { IconCheck, IconLock } from '../components/Icons'
import { criterionMet, lastPerformance, personalRecord, setValue } from '../lib/stats'
import { cx, formatRelativeDay } from '../lib/utils'

/** Catégories présentes dans les progressions, dans un ordre stable. */
const TABS: Category[] = ['push', 'pull', 'legs', 'core', 'mobility']

export function Progressions() {
  const { state, progressFor, setProgressStep } = useData()
  const [tab, setTab] = useState<Category>('push')
  const [detail, setDetail] = useState<{ pathId: string; step: number } | null>(null)

  const visibleTabs = useMemo(
    () => TABS.filter((c) => PROGRESSIONS.some((p) => p.category === c)),
    [],
  )

  /** Échelles de l'onglet courant, regroupées par famille. */
  const groups = useMemo(() => {
    const out: Array<{ family: string; paths: typeof PROGRESSIONS }> = []
    for (const path of PROGRESSIONS) {
      if (path.category !== tab) continue
      const family = path.family ?? 'Autres'
      const group = out.find((g) => g.family === family)
      if (group) group.paths.push(path)
      else out.push({ family, paths: [path] })
    }
    return out
  }, [tab])

  const detailPath = detail ? PROGRESSIONS.find((p) => p.id === detail.pathId) : undefined
  const detailStep = detailPath?.steps[detail!.step]
  const detailExercise = detailStep ? getExercise(detailStep.exerciseId) : undefined
  const detailProgress = detailPath ? progressFor(detailPath.id) : undefined
  const detailState =
    detail && detailProgress ? rungState(detail.step, detailProgress.currentStep) : 'locked'

  const detailPr = detailExercise ? personalRecord(state.sessions, detailExercise.id) : 0
  const detailLast = detailExercise
    ? lastPerformance(state.sessions, detailExercise.id)
    : undefined
  const detailMet =
    detailExercise && detailStep
      ? criterionMet(state.sessions, detailExercise.id, detailStep.criterion)
      : false

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-4xl leading-none">Progressions</h1>
        <p className="mt-1 text-sm text-muted">
          Une échelle par compétence. Valide le critère chiffré pour monter d’un barreau.
        </p>
      </header>

      {/* Onglets de catégorie */}
      <div
        role="tablist"
        aria-label="Catégories de progression"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {visibleTabs.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={tab === c}
            onClick={() => setTab(c)}
            className={cx(
              'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
              tab === c
                ? 'border-steel bg-steel/20 text-steel'
                : 'border-concrete-600 bg-concrete-800 text-muted hover:text-chalk',
            )}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {/* Échelles, par famille */}
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.family}>
            <h2 className="label-xs mb-3 border-b border-concrete-600 pb-2">
              {group.family}
              <span className="num ml-2 text-locked">{group.paths.length}</span>
            </h2>
            <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
              {group.paths.map((path) => {
                const progress = progressFor(path.id)
                const pct = Math.round((progress.currentStep / (path.steps.length - 1)) * 100)
                return (
                  <div key={path.id}>
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-2xl leading-none">{path.name}</h3>
                        <p className="num mt-1 text-xs text-muted">
                          Étape {progress.currentStep + 1} / {path.steps.length} · {pct}%
                        </p>
                      </div>
                    </div>
                    <ProgressionLadder
                      path={path}
                      currentStep={progress.currentStep}
                      onSelectStep={(step) => setDetail({ pathId: path.id, step })}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Détail d'un barreau */}
      <Sheet
        open={detail !== null}
        title={detailExercise?.name ?? 'Exercice'}
        onClose={() => setDetail(null)}
        footer={
          detail &&
          detailProgress && (
            <div className="flex flex-col gap-2">
              {detailState !== 'done' && (
                <button
                  type="button"
                  onClick={() => {
                    setProgressStep(detail.pathId, detail.step + 1)
                    setDetail(null)
                  }}
                  className="btn-primary"
                >
                  <IconCheck size={16} /> Marquer comme acquis
                </button>
              )}
              {detailState !== 'current' && (
                <button
                  type="button"
                  onClick={() => {
                    setProgressStep(detail.pathId, detail.step)
                    setDetail(null)
                  }}
                  className="btn-ghost"
                >
                  Travailler ce barreau
                </button>
              )}
            </div>
          )
        }
      >
        {detailExercise && detailStep && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge state={detailState} />
              <span className="chip">{CATEGORY_LABEL[detailExercise.category]}</span>
              <span className="chip">
                {detailExercise.type === 'time' ? 'Isométrique' : 'Répétitions'}
              </span>
              <span className="chip">
                Difficulté <span className="num">{detailExercise.difficulty}</span>/5
              </span>
            </div>

            <div>
              <h3 className="label-xs mb-1">Exécution</h3>
              <p className="text-sm leading-relaxed text-chalk/90">
                {detailExercise.description}
              </p>
            </div>

            <div>
              <h3 className="label-xs mb-1">Erreurs courantes</h3>
              <ul className="space-y-1">
                {detailExercise.commonMistakes.map((m) => (
                  <li key={m} className="flex gap-2 text-sm text-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ember" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cx(
                'rounded-soft border p-3',
                detailMet
                  ? 'border-moss/40 bg-moss/10'
                  : 'border-concrete-600 bg-concrete-700/40',
              )}
            >
              <h3 className="label-xs mb-1">Critère de passage</h3>
              <p className="num text-lg text-chalk">{detailStep.criterion.label}</p>
              <p className="mt-1 text-xs text-muted">
                {detailMet
                  ? '✓ Critère atteint sur une séance enregistrée.'
                  : 'Pas encore atteint sur une séance complète.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="label-xs">Record</p>
                <p className="num mt-1 text-xl font-bold">
                  {detailPr || '—'}
                  {detailPr ? (
                    <span className="ml-0.5 text-xs text-muted">
                      {detailExercise.type === 'time' ? 's' : 'reps'}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="card p-3">
                <p className="label-xs">Dernière fois</p>
                {detailLast ? (
                  <>
                    <p className="num mt-1 text-sm text-chalk">
                      {detailLast.sets.map((s) => setValue(s)).join(' · ')}
                    </p>
                    <p className="mt-0.5 text-[10px] text-locked">
                      {formatRelativeDay(detailLast.date)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">Jamais loggé</p>
                )}
              </div>
            </div>

            {detailState === 'locked' && (
              <p className="flex items-start gap-2 text-xs text-muted">
                <IconLock size={14} className="mt-0.5 shrink-0 text-locked" />
                Ce barreau est au-delà de ton étape actuelle. Tu peux quand même t’y
                positionner si tu l’as déjà travaillé ailleurs.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
