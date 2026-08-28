import { memo } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { flagEmoji } from '../../utils/flag'
import { isTerritory } from '../../utils/countryFilters'
import type { Country } from '../../types'

interface CountryRowProps {
  country: Country
  visited: boolean
  tripCount: number
  onSelect: (code: string) => void
}

/**
 * Riga della lista dei Paesi.
 *
 * `memo`: la lista ne renderizza fino a 250, e digitare nella ricerca fa
 * ri-renderizzare la pagina a ogni carattere. Con le props stabili solo le
 * righe che cambiano davvero rifanno il lavoro.
 */
export const CountryRow = memo(function CountryRow({
  country,
  visited,
  tripCount,
  onSelect,
}: CountryRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(country.code)}
        className="group flex w-full items-center gap-3 rounded-xl border border-edge bg-surface px-3 py-2.5 text-left transition-colors hover:border-edge-strong hover:bg-surface-raised"
      >
        <span aria-hidden className="text-xl leading-none">
          {flagEmoji(country.code)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-slate-200">{country.name}</span>
            {isTerritory(country) && (
              <span
                title="Not a UN member state — not counted in the 195"
                className="shrink-0 rounded-full border border-edge px-1.5 text-[10px] uppercase tracking-wide text-slate-600"
              >
                Territory
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span>{country.continent}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tracking-wider">{country.code}</span>
            {tripCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
                </span>
              </>
            )}
          </span>
        </span>

        {visited && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
            <Check size={11} aria-hidden />
            Visited
          </span>
        )}

        <ChevronRight
          size={15}
          aria-hidden
          className="shrink-0 text-slate-700 transition-colors group-hover:text-slate-500"
        />
      </button>
    </li>
  )
})
