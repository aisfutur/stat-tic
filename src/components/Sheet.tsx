import { useEffect, useRef, type ReactNode } from 'react'
import { IconX } from './Icons'

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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Empêche le scroll de l'arrière-plan pendant que la feuille est ouverte.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
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
            onClick={onClose}
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
