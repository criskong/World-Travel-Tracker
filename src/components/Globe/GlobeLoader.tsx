import { Plane } from 'lucide-react'

export type GlobeLoaderPhase = 'downloading' | 'placing'

export interface GlobeLoaderProps {
  phase: GlobeLoaderPhase
  /** Da 0 a 1. Ignorato in fase `downloading`, che non ha un totale noto. */
  progress: number
  /** Paesi già posati sul globo. */
  revealed: number
  total: number
}

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Pannello di caricamento del globo: un aereo che percorre la rotta mentre
 * l'arco pieno segna quanti Paesi sono già atterrati sul mappamondo.
 *
 * Niente blur: è un pannello piccolo, ma sta comunque sopra il canvas WebGL
 * e un `backdrop-filter` lì costa caro proprio nel momento in cui la CPU è
 * più occupata (CLAUDE.md, "Design").
 */
export function GlobeLoader({ phase, progress, revealed, total }: GlobeLoaderProps) {
  const placing = phase === 'placing'
  // In download il totale non si conosce: l'arco resta un accenno costante.
  const shown = placing ? progress : 0.08

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div className="flex animate-fade-in flex-col items-center gap-4 rounded-2xl border border-edge bg-base-900/85 px-8 py-6 shadow-card">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {/* La rotta: tratteggiata, come su una mappa di volo. */}
            <circle
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke="rgba(148, 163, 184, 0.22)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            {/* Il tratto già percorso. */}
            <circle
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
              transform="rotate(-90 48 48)"
              className="transition-[stroke-dashoffset] duration-300 ease-out"
            />
          </svg>

          <div className="absolute inset-0 animate-orbit motion-reduce:animate-none">
            <Plane
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rotate-90 text-accent drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-slate-200">
            {placing ? 'Placing countries' : 'Downloading the map'}
          </p>
          <p className="font-mono text-xs tabular-nums text-slate-500">
            {placing ? `${revealed} / ${total}` : 'first visit only, then it works offline'}
          </p>
        </div>
      </div>
    </div>
  )
}
