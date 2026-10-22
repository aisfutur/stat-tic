import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { useTheme, type ThemeChoice } from '../hooks/useTheme'
import { IconArrowLeft, IconDownload, IconTrash, IconUpload } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { supabase } from '../lib/supabase'
import { cx, toDayKey } from '../lib/utils'

/** Libellés du sélecteur de thème, « Système » en premier car c'est le défaut. */
const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string; hint: string }> = [
  { value: 'system', label: 'Système', hint: 'Suit le réglage du téléphone' },
  { value: 'dark', label: 'Sombre', hint: 'Béton, pour la salle le soir' },
  { value: 'light', label: 'Clair', hint: 'Craie, pour le plein jour' },
]

export function Settings() {
  const { state, setUserName, exportData, importData, resetData, loadDemoData } = useData()
  const { choice: themeChoice, theme, setChoice: setThemeChoice } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barre-sauvegarde-${toDayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Sauvegarde téléchargée.' })
  }

  async function handleImport(file: File) {
    try {
      importData(await file.text())
      setMessage({ kind: 'ok', text: 'Données importées.' })
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Import impossible.',
      })
    }
  }

  const sessionCount = state.sessions.length

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-full p-2 text-muted hover:bg-concrete-800 hover:text-chalk"
          aria-label="Retour à l’accueil"
        >
          <IconArrowLeft size={20} />
        </Link>
        <h1 className="text-4xl leading-none">Réglages</h1>
      </header>

      <section className="card p-4">
        <label htmlFor="user-name" className="label-xs mb-1.5 block">
          Ton nom
        </label>
        <input
          id="user-name"
          type="text"
          value={state.settings.name}
          onChange={(e) => setUserName(e.target.value)}
          className="field font-sans"
        />
        <p className="mt-2 text-xs text-muted">Affiché dans la salutation de l’accueil.</p>
      </section>

      <section className="card p-4">
        <h2 className="text-xl leading-none">Apparence</h2>
        <p className="mt-1.5 text-sm text-muted">
          Le thème est propre à cet appareil : il n’est pas synchronisé avec ton compte.
        </p>

        <div
          role="radiogroup"
          aria-label="Thème de l’interface"
          className="mt-3 grid gap-2 sm:grid-cols-3"
        >
          {THEME_OPTIONS.map((option) => {
            const selected = themeChoice === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setThemeChoice(option.value)}
                className={cx(
                  'rounded-soft border px-3 py-2.5 text-left transition-colors',
                  selected
                    ? 'border-steel bg-steel/15'
                    : 'border-concrete-600 bg-concrete-700/40 hover:bg-concrete-700',
                )}
              >
                <p
                  className={cx(
                    'font-display text-lg leading-none',
                    selected ? 'text-steel' : 'text-chalk',
                  )}
                >
                  {option.label}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted">{option.hint}</p>
              </button>
            )
          })}
        </div>

        {themeChoice === 'system' && (
          <p className="mt-2 text-xs text-muted">
            Actuellement : <span className="text-chalk">{theme === 'dark' ? 'sombre' : 'clair'}</span>.
          </p>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-xl leading-none">Mes données</h2>
        <p className="mt-1.5 text-sm text-muted">
          {supabase
            ? 'Tout est enregistré dans ta base Supabase, sans compte ni connexion : l’app est la seule à y écrire. Un export reste la seule copie que tu gardes hors ligne.'
            : 'Tout est stocké dans ce navigateur. Il n’y a pas de sauvegarde en ligne : exporte régulièrement si tes données comptent.'}
        </p>
        <p className="num mt-3 text-sm text-chalk">
          {sessionCount} séances · {state.customRoutines.length} routines perso ·{' '}
          {state.customExercises.length} exercices perso
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={handleExport} className="btn-ghost flex-1">
            <IconDownload size={16} /> Exporter (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost flex-1"
          >
            <IconUpload size={16} /> Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ''
            }}
          />
        </div>

        {message && (
          <p
            className={
              message.kind === 'ok' ? 'mt-3 text-xs text-moss' : 'mt-3 text-xs text-ember'
            }
          >
            {message.text}
          </p>
        )}
      </section>

      <section className="card border-ember/30 p-4">
        <h2 className="text-xl leading-none">Zone sensible</h2>
        <p className="mt-1.5 text-sm text-muted">
          Efface toutes tes séances et tes progressions. Ton nom et ton thème sont
          conservés. Pense à exporter d’abord.
        </p>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="btn-ghost mt-4 w-full text-ember"
        >
          <IconTrash size={16} /> Effacer mes données
        </button>

        <p className="mt-4 border-t border-concrete-600 pt-4 text-sm text-muted">
          L’historique de démonstration (10 semaines de séances fictives) sert à voir les
          écrans remplis. Il <span className="text-chalk">remplace</span> tes données
          réelles : streak, records et courbes deviennent ceux de la démo.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDemo(true)}
          className="btn-ghost mt-3 w-full"
        >
          Charger l’historique de démo
        </button>
      </section>

      <p className="pb-4 text-center text-xs text-locked">
        Barre · app personnelle, sans compte ni fonctionnalité sociale.
      </p>

      <Sheet
        open={confirmReset}
        title="Tout effacer ?"
        onClose={() => setConfirmReset(false)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                resetData()
                setConfirmReset(false)
                setMessage({ kind: 'ok', text: 'Données effacées.' })
              }}
              className="btn-ember"
            >
              Oui, tout effacer
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="btn-ghost"
            >
              Annuler
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Tes <span className="num text-chalk">{sessionCount}</span> séances, tes
          progressions, tes routines et tes exercices perso seront supprimés, ici comme
          en ligne. Pense à exporter d’abord.
        </p>
      </Sheet>

      <Sheet
        open={confirmDemo}
        title="Charger la démo ?"
        onClose={() => setConfirmDemo(false)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                loadDemoData()
                setConfirmDemo(false)
                setMessage({ kind: 'ok', text: 'Historique de démonstration chargé.' })
              }}
              className="btn-ember"
            >
              Oui, charger la démo
            </button>
            <button
              type="button"
              onClick={() => setConfirmDemo(false)}
              className="btn-ghost"
            >
              Annuler
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Tes <span className="num text-chalk">{sessionCount}</span> séances seront
          remplacées par <span className="text-chalk">10 semaines de séances fictives</span>.
          À n’utiliser que pour explorer l’app.
        </p>
      </Sheet>
    </div>
  )
}
