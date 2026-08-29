import { Plane } from 'lucide-react'

/**
 * Attesa del dataset.
 *
 * Si vede SOLO finché non c'è niente da mostrare. Appena i primi Paesi
 * atterrano sul globo questo pannello sparisce: da lì in poi è il mappamondo
 * che prende forma a dire che sta caricando, e due indicatori di avanzamento
 * contemporanei — un contatore qui e i continenti che compaiono dietro —
 * erano uno di troppo.
 *
 * Niente blur: è un pannello piccolo, ma sta sopra il canvas WebGL proprio
 * nel momento in cui la CPU è più occupata (CLAUDE.md, "Design").
 */
export function GlobeLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div className="flex animate-fade-in flex-col items-center gap-4 rounded-2xl border border-edge bg-base-900/85 px-8 py-6 shadow-card">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {/* La rotta, tratteggiata come su una mappa di volo. */}
            <circle
              cx="40"
              cy="40"
              r="29"
              fill="none"
              stroke="rgba(148, 163, 184, 0.22)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          </svg>

          <div className="absolute inset-0 animate-orbit motion-reduce:animate-none">
            <Plane
              size={15}
              strokeWidth={2}
              aria-hidden="true"
              className="absolute left-1/2 top-1.5 -translate-x-1/2 -translate-y-1/2 rotate-90 text-accent drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-slate-200">Loading the map</p>
          <p className="text-xs text-slate-500">First visit only — then it is kept on your device</p>
        </div>
      </div>
    </div>
  )
}
