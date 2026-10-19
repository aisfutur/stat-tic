import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Barre reste mono-utilisateur et sans fonctionnalité sociale : ce compte ne
 * sert qu'à une chose, prouver à la base que les données sont les tiennes
 * (toute la RLS repose sur `auth.uid()`). Sans Supabase configuré, la porte
 * est ouverte et l'app persiste dans `localStorage`.
 */
export function AuthGate({ children }: { children: (userId: string | null) => ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setUserId(data.session?.user.id ?? null)
      setChecking(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
      setChecking(false)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (!supabase) return <>{children(null)}</>
  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display text-3xl tracking-widest text-locked">BARRE</p>
      </div>
    )
  }
  if (!userId) return <SignIn />
  return <>{children(userId)}</>
}

type Mode = 'signin' | 'signup'

function SignIn() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const client = supabase
    if (!client) return
    setBusy(true)
    setError(null)
    setInfo(null)

    const result =
      mode === 'signin'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password })

    if (result.error) {
      setError(result.error.message)
    } else if (!result.data.session) {
      // Les confirmations d'e-mail sont actives sur le projet : pas de session
      // avant que le lien reçu ait été ouvert.
      setInfo('Compte créé. Ouvre le lien de confirmation reçu par e-mail, puis connecte-toi.')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <h1 className="text-center text-5xl leading-none">Barre</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Tes séances sont synchronisées sur ton espace Supabase. Personne d'autre n'y a accès.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-3 p-4">
        <div>
          <label htmlFor="email" className="label-xs mb-1.5 block">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field font-sans"
          />
        </div>
        <div>
          <label htmlFor="password" className="label-xs mb-1.5 block">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field font-sans"
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>

        {error && <p className="text-xs text-ember">{error}</p>}
        {info && <p className="text-xs text-moss">{info}</p>}
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setError(null)
          setInfo(null)
        }}
        className="mt-4 text-center text-xs text-muted underline-offset-4 hover:text-chalk hover:underline"
      >
        {mode === 'signin' ? 'Pas encore de compte ? En créer un' : "J'ai déjà un compte"}
      </button>
    </div>
  )
}
