import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal minima.
 *
 * Lo sfondo è un velo tinto, NON sfocato: su Home la modal si apre sopra il
 * canvas WebGL, e un `backdrop-blur` a schermo intero lì costa un'intera
 * ricomposizione per frame su mobile (CLAUDE.md, sezione Design).
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    // Il primo elemento focusabile del pannello, così la tastiera entra dentro.
    panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 animate-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-slide-in rounded-2xl border border-edge-strong bg-base-800 p-5 shadow-card"
      >
        {children}
      </div>
    </div>
  )
}
