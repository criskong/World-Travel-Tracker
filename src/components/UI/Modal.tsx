import { useEffect, useRef } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Elementi che possono ricevere il fuoco da tastiera. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal minima, ma con la tastiera che funziona davvero.
 *
 * Tre comportamenti che una modal deve avere e che non arrivano gratis:
 * - Esc chiude;
 * - il fuoco entra nel pannello e non ne esce con Tab (senza trappola si
 *   finisce a navigare la pagina dietro, che per chi non vede il velo scuro
 *   significa perdersi del tutto);
 * - alla chiusura il fuoco torna dov'era, non all'inizio del documento.
 *
 * Lo sfondo è un velo tinto, NON sfocato: su Home la modal si apre sopra il
 * canvas WebGL, e un `backdrop-blur` a schermo intero lì costa un'intera
 * ricomposizione per frame su mobile (CLAUDE.md, sezione Design).
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Chi aveva il fuoco prima: ci torna quando la modal si chiude.
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current

    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement

      // Il giro si chiude su sé stesso: dall'ultimo si torna al primo.
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        // Fuori dal giro del Tab: è il velo, non un comando da raggiungere
        // con la tastiera, che per chiudere ha già Esc.
        tabIndex={-1}
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
