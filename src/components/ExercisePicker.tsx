import { useEffect, useMemo, useState } from 'react'
import type { Category, Exercise, MeasureType } from '../types'
import { CATEGORY_LABEL } from '../data/exercises'
import { useData } from '../hooks/useData'
import { Sheet } from './Sheet'
import { IconPlus, IconTrash, IconX } from './Icons'
import { cx, normalizeText, searchTokens } from '../lib/utils'

const CATEGORIES: Array<Category | 'all'> = ['all', 'push', 'pull', 'legs', 'core', 'mobility']

/**
 * Texte dans lequel la recherche cherche : nom, muscles, catégorie et type.
 * Normalisé une fois par exercice — « epaules » doit trouver « Épaules ».
 */
function haystack(ex: Exercise): string {
  return normalizeText(
    [
      ex.name,
      ...ex.muscles,
      CATEGORY_LABEL[ex.category],
      ex.type === 'time' ? 'maintien isometrique temps' : 'repetitions reps',
      ex.custom ? 'perso' : '',
    ].join(' '),
  )
}

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
  const { exercises, deleteCustomExercise, isExerciseInUse } = useData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [creating, setCreating] = useState(false)

  // Le composant reste monté entre deux ouvertures : sans ça, la feuille
  // rouvrirait sur la recherche et le filtre de la fois précédente.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCategory('all')
    setCreating(false)
  }, [open])

  const index = useMemo(
    () => exercises.map((ex) => ({ ex, text: haystack(ex) })),
    [exercises],
  )

  const results = useMemo(() => {
    const tokens = searchTokens(query)
    return index
      .filter(({ ex, text }) => {
        if (category !== 'all' && ex.category !== category) return false
        // Tous les mots doivent être présents : « pompe incl » trouve
        // « Pompe inclinée », mais « pompe traction » ne trouve rien.
        return tokens.every((token) => text.includes(token))
      })
      .map(({ ex }) => ex)
  }, [index, query, category])

  const trimmedQuery = query.trim()

  return (
    <>
      <Sheet open={open} title={title} onClose={onClose}>
        <div className="relative mb-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un exercice…"
            aria-label="Rechercher un exercice"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            className="field font-sans [&::-webkit-search-cancel-button]:hidden"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-chalk"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

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
          <div className="py-6 text-center">
            <p className="text-sm text-muted">Aucun exercice ne correspond.</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-ghost mt-4 w-full border-dashed"
            >
              <IconPlus size={16} />
              {trimmedQuery ? `Créer « ${trimmedQuery} »` : 'Créer un exercice'}
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {results.map((ex) => (
                <li key={ex.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPick(ex.id)
                      onClose()
                    }}
                    className="min-w-0 flex-1 rounded-soft border border-concrete-600 bg-concrete-700/40
                      px-4 py-3 text-left transition-colors hover:border-steel/50 hover:bg-concrete-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg leading-tight">{ex.name}</p>
                        <p className="truncate text-xs text-muted">
                          {ex.muscles.length > 0
                            ? ex.muscles.join(' · ')
                            : CATEGORY_LABEL[ex.category]}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {ex.custom && (
                          <span className="chip border-steel/40 bg-steel/15 text-steel">
                            Perso
                          </span>
                        )}
                        <span className="chip">{ex.type === 'time' ? 'Temps' : 'Reps'}</span>
                        <span className="num text-xs text-locked">N{ex.difficulty}</span>
                      </div>
                    </div>
                  </button>

                  {/* Un exercice perso déjà loggé reste : la base refuserait de
                      l'effacer, et l'historique perdrait son libellé. */}
                  {ex.custom && !isExerciseInUse(ex.id) && (
                    <button
                      type="button"
                      onClick={() => deleteCustomExercise(ex.id)}
                      aria-label={`Supprimer ${ex.name}`}
                      className="shrink-0 rounded-soft border border-concrete-600 px-3 text-muted
                        transition-colors hover:border-ember/50 hover:text-ember"
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-ghost mt-3 w-full border-dashed"
            >
              <IconPlus size={16} /> Créer un exercice
            </button>
          </>
        )}
      </Sheet>

      <ExerciseCreator
        open={creating}
        initialName={trimmedQuery}
        initialCategory={category === 'all' ? 'push' : category}
        onClose={() => setCreating(false)}
        onCreated={(exerciseId) => {
          setCreating(false)
          onPick(exerciseId)
          onClose()
        }}
      />
    </>
  )
}

/** Formulaire d'ajout d'un exercice hors catalogue. */
function ExerciseCreator({
  open,
  initialName,
  initialCategory,
  onClose,
  onCreated,
}: {
  open: boolean
  initialName: string
  initialCategory: Category
  onClose: () => void
  onCreated: (exerciseId: string) => void
}) {
  const { addCustomExercise } = useData()
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<Category>(initialCategory)
  const [type, setType] = useState<MeasureType>('reps')
  const [muscles, setMuscles] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Exercise['difficulty']>(2)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplit avec ce qui était tapé dans la recherche, à chaque ouverture.
  useEffect(() => {
    if (!open) return
    setName(initialName)
    setCategory(initialCategory)
    setType('reps')
    setMuscles('')
    setDescription('')
    setDifficulty(2)
    setError(null)
  }, [open, initialName, initialCategory])

  function submit() {
    if (!name.trim()) {
      setError('Donne un nom à l’exercice.')
      return
    }
    const created = addCustomExercise({
      name,
      category,
      type,
      muscles: muscles.split(',').map((m) => m.trim()).filter(Boolean),
      description,
      difficulty,
    })
    onCreated(created.id)
  }

  return (
    <Sheet
      open={open}
      title="Nouvel exercice"
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && <p className="text-xs text-ember">{error}</p>}
          <button type="button" onClick={submit} className="btn-primary w-full">
            Créer et ajouter
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="ex-name" className="label-xs mb-1 block">
            Nom
          </label>
          <input
            id="ex-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Tirage à la serviette"
            className="field font-sans"
          />
        </div>

        <div>
          <span className="label-xs mb-1 block">Mesure</span>
          <div className="flex gap-2">
            {([
              ['reps', 'Répétitions'],
              ['time', 'Maintien (s)'],
            ] as Array<[MeasureType, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={type === value}
                className={cx(
                  'chip flex-1 justify-center py-2',
                  type === value && 'border-steel bg-steel/20 text-steel',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label-xs mb-1 block">Catégorie</span>
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
          <p className="mt-1.5 text-[10px] text-locked">
            Détermine dans quel volume l’exercice compte, côté statistiques.
          </p>
        </div>

        <div>
          <span className="label-xs mb-1 block">
            Difficulté · <span className="num">{difficulty}</span>/5
          </span>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as Array<Exercise['difficulty']>).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={cx(
                  'num chip flex-1 justify-center py-2',
                  difficulty === d && 'border-steel bg-steel/20 text-steel',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ex-muscles" className="label-xs mb-1 block">
            Muscles (séparés par des virgules)
          </label>
          <input
            id="ex-muscles"
            type="text"
            value={muscles}
            onChange={(e) => setMuscles(e.target.value)}
            placeholder="Dorsaux, Biceps"
            className="field font-sans"
          />
        </div>

        <div>
          <label htmlFor="ex-desc" className="label-xs mb-1 block">
            Exécution (optionnel)
          </label>
          <textarea
            id="ex-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ce qu’il faut garder en tête pendant le mouvement."
            className="field resize-none font-sans"
          />
        </div>
      </div>
    </Sheet>
  )
}
