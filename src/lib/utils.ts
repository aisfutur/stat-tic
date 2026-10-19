/** Identifiant court, suffisant pour une app mono-utilisateur locale. */
export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Concatène des classes conditionnelles. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Jour local au format `YYYY-MM-DD` (pas d'UTC : ne décale pas la date du soir). */
export function toDayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Nombre de jours calendaires entre deux clés de jour (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Lundi de la semaine contenant `d`. */
export function startOfWeek(d: Date = new Date()): Date {
  const copy = new Date(d)
  const dow = (copy.getDay() + 6) % 7 // lundi = 0
  copy.setDate(copy.getDate() - dow)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** `125` → `"2:05"`, `3725` → `"1:02:05"`. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Durée compacte pour les listes : `"42 min"`, `"1 h 05"`. */
export function formatShortDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** `"mardi 14 octobre"` */
export function formatLongDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

/** `"14 oct."` */
export function formatShortDate(key: string): string {
  const d = fromDayKey(key)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 4)}.`
}

/** Libellé relatif : `"aujourd'hui"`, `"hier"`, `"il y a 3 j"`. */
export function formatRelativeDay(key: string): string {
  const diff = daysBetween(key, toDayKey())
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} j`
  if (diff < 30) return `il y a ${Math.floor(diff / 7)} sem.`
  return formatShortDate(key)
}

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
