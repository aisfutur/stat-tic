import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Client Supabase, ou `null` si le projet n'est pas configuré : l'app
 * retombe alors sur `localStorage` (voir `main.tsx`), ce qui garde un
 * `npm run dev` fonctionnel sans backend.
 *
 * Aucune session à conserver : l'app est mono-propriétaire et ne se connecte
 * pas (la RLS compare à `public.owner_id()`, pas à `auth.uid()`). On coupe
 * donc la persistance et le rafraîchissement de jeton, inutiles ici.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null
