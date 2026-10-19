import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Client Supabase, ou `null` si le projet n'est pas configuré : l'app
 * retombe alors sur `localStorage` (voir `main.tsx`), ce qui garde un
 * `npm run dev` fonctionnel sans backend.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storageKey: 'barre.auth',
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null
