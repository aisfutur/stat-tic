/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase. Absente → l'app persiste dans `localStorage`. */
  readonly VITE_SUPABASE_URL?: string
  /** Clé publiable (anon). La RLS fait la sécurité, pas le secret de la clé. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
