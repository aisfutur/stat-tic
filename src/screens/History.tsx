import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { SessionHistory } from '../components/SessionHistory'
import { IconArrowLeft } from '../components/Icons'

export function History() {
  const { state } = useData()

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
        <div>
          <h1 className="text-4xl leading-none">Historique</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="num">{state.sessions.length}</span> séances enregistrées
          </p>
        </div>
      </header>

      <SessionHistory sessions={state.sessions} />
    </div>
  )
}
