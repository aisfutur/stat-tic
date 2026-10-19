import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Carte « compte » des réglages. Ne s'affiche que si un projet Supabase est
 * configuré : sans lui, il n'y a pas de compte du tout.
 */
export function AccountCard() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!supabase) return null

  return (
    <section className="card p-4">
      <h2 className="text-xl leading-none">Compte</h2>
      <p className="mt-1.5 text-sm text-muted">
        Tes séances sont synchronisées sur ton espace Supabase, visible de toi seul.
      </p>
      {email && <p className="num mt-3 text-sm text-chalk">{email}</p>}
      <button
        type="button"
        onClick={() => void supabase?.auth.signOut()}
        className="btn-ghost mt-4 w-full"
      >
        Se déconnecter
      </button>
    </section>
  )
}
