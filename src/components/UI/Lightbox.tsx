import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'

interface LightboxProps {
  urls: readonly string[]
  /** Indice della foto da cui partire. */
  index: number
  onClose: () => void
}

/** Quanti pixel di scorrimento orizzontale contano come "sfoglia". */
const SWIPE_THRESHOLD = 40

/**
 * Una foto a tutto schermo, con le altre del viaggio a fianco.
 *
 * Tastiera: Esc chiude, le frecce sfogliano. Tocco: si scorre di lato.
 * L'ascolto della tastiera e in fase di CATTURA e ferma la propagazione:
 * sotto c'e CountryDetails, che chiude i dettagli su Esc, e senza questo un
 * solo tasto chiuderebbe foto e pannello insieme.
 *
 * Il fondo e un velo scuro pieno, non sfocato: e a schermo intero, e su Home
 * sta sopra il canvas WebGL (CLAUDE.md, sezione Design).
 *
 * Va in un portal su `body`: la card sta dentro pannelli con `transform` e
 * `backdrop-filter`, che fanno da contenitore per un `fixed` — senza portal
 * la foto si aprirebbe DENTRO il pannello, ritagliata.
 */
export function Lightbox({ urls, index, onClose }: LightboxProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(() => Math.min(Math.max(index, 0), urls.length - 1))
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)

  const total = urls.length
  const many = total > 1

  const step = useCallback(
    (delta: number) => {
      if (!many) return
      setCurrent((value) => (value + delta + total) % total)
    },
    [many, total],
  )

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (event.key === 'ArrowRight') {
        event.stopPropagation()
        step(1)
      } else if (event.key === 'ArrowLeft') {
        event.stopPropagation()
        step(-1)
      } else if (event.key === 'Tab') {
        // Il fuoco resta fra i comandi della foto.
        const focusable = [...document.querySelectorAll<HTMLElement>('[data-lightbox-control]')]
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [onClose, step])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('visit.photoAlt')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current
        touchStartX.current = null
        const end = event.changedTouches[0]?.clientX
        if (start === null || end === undefined) return
        if (end - start > SWIPE_THRESHOLD) step(-1)
        else if (start - end > SWIPE_THRESHOLD) step(1)
      }}
    >
      {/* Il velo chiude: e la cosa che si fa d'istinto. */}
      <button
        type="button"
        aria-label={t('lightbox.close')}
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
      />

      <img
        src={urls[current]}
        alt={t('visit.photoAlt')}
        className="relative max-h-[88dvh] max-w-[94vw] select-none rounded-lg object-contain shadow-card"
        draggable={false}
      />

      <button
        ref={closeRef}
        type="button"
        data-lightbox-control
        onClick={onClose}
        aria-label={t('lightbox.close')}
        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-slate-200 transition-colors hover:bg-black/80 hover:text-white mt-safe-t"
      >
        <X size={18} aria-hidden />
      </button>

      {many && (
        <>
          <button
            type="button"
            data-lightbox-control
            onClick={() => step(-1)}
            aria-label={t('lightbox.prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-slate-200 transition-colors hover:bg-black/80 hover:text-white sm:left-4"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            data-lightbox-control
            onClick={() => step(1)}
            aria-label={t('lightbox.next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-slate-200 transition-colors hover:bg-black/80 hover:text-white sm:right-4"
          >
            <ChevronRight size={22} aria-hidden />
          </button>
          <p
            aria-live="polite"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs tabular-nums text-slate-300 mb-safe-b"
          >
            {t('lightbox.counter', { current: current + 1, total })}
          </p>
        </>
      )}
    </div>,
    document.body,
  )
}
