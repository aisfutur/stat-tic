import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Thème de l'interface.
 *
 * Le choix est un réglage de l'appareil, pas de l'athlète : il vit dans
 * `localStorage` et non dans `AppState`. Changer de téléphone ou passer du
 * mobile au desktop ne traîne donc pas un thème choisi ailleurs, et le thème
 * s'applique avant même que les données (locales ou Supabase) soient chargées.
 */
export type ThemeChoice = 'system' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'barre.theme.v1'

/** Couleur de la barre d'adresse mobile, par thème. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: '#1A1D1E',
  light: '#F2EFE8',
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredChoice(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  } catch {
    // Stockage indisponible (navigation privée) : on suit le système.
  }
  return 'system'
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
    ? 'dark'
    : 'light'
}

interface ThemeContextValue {
  /** Ce que l'athlète a choisi dans les réglages. */
  choice: ThemeChoice
  /** Ce qui est réellement affiché, « system » résolu. */
  theme: ResolvedTheme
  setChoice(choice: ThemeChoice): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  // Suit la préférence de l'OS tant que le choix est « system ».
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    setSystem(media.matches ? 'dark' : 'light')
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme: ResolvedTheme = choice === 'system' ? system : choice

  // Posé pendant le rendu, et non dans un effet : `useThemeColors()` relit les
  // variables CSS pendant le rendu des enfants, qui a lieu avant que les
  // effets ne s'exécutent. Dans un effet, les graphiques garderaient les
  // couleurs de l'ancien thème jusqu'au rendu suivant.
  if (document.documentElement.dataset.theme !== theme) {
    document.documentElement.dataset.theme = theme
  }

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Préférence non mémorisée : le thème reste appliqué pour cette session.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, theme, setChoice }),
    [choice, theme, setChoice],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() doit être utilisé dans <ThemeProvider>')
  return ctx
}

/** Rôles de couleur nécessaires au code qui ne passe pas par Tailwind. */
export interface ThemeColors {
  chalk: string
  muted: string
  steel: string
  ember: string
  moss: string
  locked: string
  border: string
  surface: string
}

function cssColor(name: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? `rgb(${raw})` : fallback
}

/**
 * Couleurs résolues pour les consommateurs qui exigent une valeur et non une
 * classe : Recharts et les attributs `stroke` des SVG. Elles sont relues dans
 * les variables CSS, qui restent l'unique source de vérité des palettes.
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme()
  return useMemo<ThemeColors>(
    () => ({
      chalk: cssColor('--c-chalk', '#EDEAE2'),
      muted: cssColor('--c-muted', '#9CA6A3'),
      steel: cssColor('--c-steel', '#6E9BC7'),
      ember: cssColor('--c-ember', '#C1502E'),
      moss: cssColor('--c-moss', '#7A9A63'),
      locked: cssColor('--c-locked', '#4A4E4F'),
      border: cssColor('--c-concrete-600', '#363B3D'),
      surface: cssColor('--c-concrete-800', '#24282A'),
    }),
    // `theme` n'est pas lu directement : il sert à relire les variables CSS
    // après que le changement de thème a été posé sur <html>.
    [theme],
  )
}
