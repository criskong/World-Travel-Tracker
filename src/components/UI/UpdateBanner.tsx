import { Download, X } from 'lucide-react'

export interface UpdateBannerProps {
  /** `true` quando c'è una versione nuova già scaricata e pronta. */
  visible: boolean
  /** Applica l'aggiornamento e ricarica. */
  onUpdate: () => void
  /** Rimanda: l'aggiornamento resta lì e si riproporrà al prossimo avvio. */
  onDismiss: () => void
  busy?: boolean
}

/**
 * Avviso di nuova versione disponibile.
 *
 * Presentazionale e senza dipendenze dal service worker, così è collaudabile
 * senza simulare un browser con i worker: chi lo usa gli passa stato e
 * callback.
 */
export function UpdateBanner({ visible, onUpdate, onDismiss, busy = false }: UpdateBannerProps) {
  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] sm:pb-6"
    >
      <div className="pointer-events-auto flex w-full max-w-md animate-slide-in items-center gap-3 rounded-2xl border border-accent/30 bg-base-800 px-4 py-3 shadow-card">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent">
          <Download size={17} strokeWidth={1.8} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100">A new version is ready</p>
          <p className="mt-0.5 text-xs text-muted">
            Reload to get it. Your countries and trips are not affected.
          </p>
        </div>

        <button
          type="button"
          onClick={onUpdate}
          disabled={busy}
          className="shrink-0 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:enabled:bg-accent/20 disabled:opacity-50"
        >
          {busy ? 'Reloading…' : 'Reload'}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss update notice"
          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-slate-300"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
