import { memo } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { flagEmoji } from '../../utils/flag'
import { isTerritory } from '../../utils/countryFilters'
import { useTranslation } from '../../i18n/useTranslation'
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
  const { t, country: countryLabel, continent } = useTranslation()

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
            <span className="truncate text-sm font-medium text-slate-200">
              {countryLabel(country.code)}
            </span>
            {isTerritory(country) && (
              <span
                title={t('common.territoryHint')}
                className="shrink-0 rounded-full border border-edge px-1.5 text-[10px] uppercase tracking-wide text-subtle"
              >
                {t('common.territory')}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <span>{continent(country.continent)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tracking-wider">{country.code}</span>
            {tripCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{t('common.trip#', { count: tripCount })}</span>
              </>
            )}
          </span>
        </span>

        {visited && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
            <Check size={11} aria-hidden />
            {t('common.visited')}
          </span>
        )}

        <ChevronRight
          size={15}
          aria-hidden
          className="shrink-0 text-slate-700 transition-colors group-hover:text-muted"
        />
      </button>
    </li>
  )
})
