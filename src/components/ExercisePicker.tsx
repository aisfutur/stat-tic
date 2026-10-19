import { useMemo, useState } from 'react'
import type { Category } from '../types'
import { CATEGORY_LABEL, EXERCISES } from '../data/exercises'
import { Sheet } from './Sheet'
import { cx } from '../lib/utils'

const CATEGORIES: Array<Category | 'all'> = ['all', 'push', 'pull', 'legs', 'core', 'mobility']

/** Sélecteur d'exercice : recherche texte + filtre par catégorie. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Ajouter un exercice',
}: {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  title?: string
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISES.filter((ex) => {
      if (category !== 'all' && ex.category !== category) return false
      if (!q) return true
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscles.some((m) => m.toLowerCase().includes(q))
      )
    })
  }, [query, category])

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un exercice…"
        aria-label="Rechercher un exercice"
        className="field mb-3 font-sans"
      />

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cx(
              'chip shrink-0 transition-colors',
              category === c
                ? 'border-steel bg-steel/20 text-steel'
                : 'hover:text-chalk',
            )}
          >
            {c === 'all' ? 'Tout' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucun exercice ne correspond.</p>
      ) : (
        <ul className="space-y-2">
          {results.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(ex.id)
                  onClose()
                }}
                className="w-full rounded-soft border border-concrete-600 bg-concrete-700/40 px-4 py-3
                  text-left transition-colors hover:border-steel/50 hover:bg-concrete-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg leading-tight">{ex.name}</p>
                    <p className="truncate text-xs text-muted">{ex.muscles.join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="chip">{ex.type === 'time' ? 'Temps' : 'Reps'}</span>
                    <span className="num text-xs text-locked">N{ex.difficulty}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
