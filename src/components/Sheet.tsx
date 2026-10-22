import { useEffect, useRef, type ReactNode } from 'react'
import { IconX } from './Icons'

/**
 * Pile des feuilles ouvertes : seule celle du dessus réagit à Échap,
 * sinon une touche fermerait d'un coup la feuille et celle qui l'a ouverte.
 */
const stack: symbol[] = []

/**
 * Feuille modale remontant du bas (mobile) / centrée (desktop).
 * Ferme sur Échap et sur clic hors du panneau, et place le focus
 * à l'intérieur à l'ouverture.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Les appelants passent presque toujours une lambda (`onClose={() => …}`),
  // dont l'identité change à chaque rendu du parent — et l'écran de séance se
  // rend une fois par seconde à cause du chrono. Sans cette indirection,
  // l'effet ci-dessous rejouerait en boucle et reprendrait le focus au champ
  // de recherche entre deux frappes.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = Symbol('sheet')
    stack.push(token)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stack[stack.length - 1] !== token) return
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)

    // Empêche le scroll de l'arrière-plan pendant que la feuille est ouverte.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      const index = stack.lastIndexOf(token)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="scrim absolute inset-0 backdrop-blur-sm"
        onClick={() => closeRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full max-w-lg animate-slide-up flex-col
          rounded-t-card border border-concrete-600 bg-concrete-800 sm:rounded-card"
      >
        <header className="flex items-center justify-between gap-3 border-b border-concrete-600 px-5 py-4">
          <h2 className="font-display text-2xl leading-none">{title}</h2>
          <button
            type="button"
            onClick={() => closeRef.current()}
            className="rounded-full p-1.5 text-muted hover:bg-concrete-700 hover:text-chalk"
            aria-label="Fermer"
          >
            <IconX size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="border-t border-concrete-600 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
