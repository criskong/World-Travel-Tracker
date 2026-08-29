interface ProgressBarProps {
  /** Da 0 a 1. Valori fuori scala vengono tagliati. */
  value: number
  /**
   * Descrizione per chi non vede la barra. Obbligatoria: una barra senza
   * etichetta non comunica niente a uno screen reader.
   */
  label: string
  tone?: 'accent' | 'muted'
  size?: 'sm' | 'md'
}

/**
 * Barra di avanzamento. Unico posto in cui vive questo disegno: la usano le
 * statistiche per continente e gli achievement, e devono restare identiche.
 */
export function ProgressBar({ value, label, tone = 'accent', size = 'sm' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const percent = Math.round(clamped * 100)

  return (
    <div
      role="img"
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-white/5 ${size === 'md' ? 'h-2' : 'h-1.5'}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          tone === 'accent' ? 'bg-accent' : 'bg-slate-600'
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
