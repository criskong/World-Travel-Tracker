import { useCallback, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { COUNTRIES } from '../data/countries/countries'
import { CountryRow } from '../components/CountryList/CountryRow'
import { CountryDetailsDrawer } from '../components/CountryDetails/CountryDetailsDrawer'
import { useVisitedCodes } from '../hooks/useVisitedCodes'
import { useTravelStore } from '../store/travelStore'
import { countByStatus, filterCountries } from '../utils/countryFilters'
import type { CountryFilters, VisitStatusFilter } from '../utils/countryFilters'
import { CONTINENTS } from '../types'
import type { Continent } from '../types'
import { useTranslation } from '../i18n/useTranslation'
import type { TranslationKey } from '../i18n/translate'

const STATUS_TABS: Array<{ value: VisitStatusFilter; label: TranslationKey }> = [
  { value: 'all', label: 'countries.tab.all' },
  { value: 'visited', label: 'countries.tab.visited' },
  { value: 'not-visited', label: 'countries.tab.notVisited' },
]

/**
 * Elenco completo dei Paesi, con ricerca, filtri e ordinamento alfabetico.
 *
 * NESSUNA virtualizzazione: il caso peggiore è 250 righe di markup piatto, che
 * il browser gestisce senza fatica. Virtualizzare costerebbe una dipendenza,
 * romperebbe Ctrl+F del browser e l'accessibilità della lista, e servirebbe a
 * risolvere un problema che non abbiamo. Se un giorno le righe diventassero
 * migliaia, questo è il punto da rivedere.
 */
export default function Countries() {
  const { t, continent: continentLabel, country: countryLabel, compare } = useTranslation()
  const [filters, setFilters] = useState<CountryFilters>({
    query: '',
    status: 'all',
    continent: null,
  })
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const visited = useVisitedCodes()
  const visits = useTravelStore((state) => state.visits)

  const tripCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const visit of visits) {
      const code = visit.countryCode.toUpperCase()
      counts.set(code, (counts.get(code) ?? 0) + 1)
    }
    return counts
  }, [visits])

  // Ricerca e ordinamento seguono la lingua: in italiano "Germania" non sta
  // dove sta "Germany".
  const naming = useCallback(
    (country: { code: string }) => countryLabel(country.code),
    [countryLabel],
  )
  const results = useMemo(
    () => filterCountries(COUNTRIES, filters, visited, naming, compare),
    [compare, filters, naming, visited],
  )
  const counts = useMemo(
    () => countByStatus(COUNTRIES, filters, visited, naming),
    [filters, naming, visited],
  )

  const handleSelect = useCallback((code: string) => setSelectedCode(code), [])
  const handleClose = useCallback(() => setSelectedCode(null), [])

  const countFor = (status: VisitStatusFilter) =>
    status === 'all' ? counts.total : status === 'visited' ? counts.visited : counts.notVisited

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('countries.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t('countries.subtitle', { visited: counts.visited, total: COUNTRIES.length })}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder={t('countries.searchPlaceholder')}
            aria-label={t('countries.search')}
            className="w-full rounded-xl border border-edge bg-surface py-2.5 pl-9 pr-9 text-sm text-slate-200 placeholder:text-subtle transition-colors focus:border-accent/50"
          />
          {filters.query.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters((current) => ({ ...current, query: '' }))}
              aria-label={t('countries.clearSearch')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-subtle transition-colors hover:text-slate-300"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t('countries.filterByStatus')}
          className="flex gap-1 rounded-xl border border-edge bg-surface p-1"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filters.status === tab.value}
              onClick={() => setFilters((current) => ({ ...current, status: tab.value }))}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                filters.status === tab.value
                  ? 'bg-accent-dim text-accent'
                  : 'text-muted hover:text-slate-300'
              }`}
            >
              {t(tab.label)}
              <span className="ml-1.5 tabular-nums opacity-60">{countFor(tab.value)}</span>
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label={t('countries.filterByContinent')}
          className="flex flex-wrap gap-1.5"
        >
          <ContinentChip
            label={t('countries.allContinents')}
            active={filters.continent === null}
            onClick={() => setFilters((current) => ({ ...current, continent: null }))}
          />
          {CONTINENTS.map((continent) => (
            <ContinentChip
              key={continent}
              label={continentLabel(continent)}
              active={filters.continent === continent}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  continent: current.continent === continent ? null : (continent as Continent),
                }))
              }
            />
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm leading-relaxed text-muted">
          {t('countries.empty')}
          <br />
          {t('countries.emptyHint')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {results.map((country) => (
            <CountryRow
              key={country.code}
              country={country}
              visited={visited.has(country.code)}
              tripCount={tripCounts.get(country.code) ?? 0}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      )}

      <CountryDetailsDrawer code={selectedCode} onClose={handleClose} />
    </div>
  )
}

function ContinentChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-accent/40 bg-accent-dim text-accent'
          : 'border-edge text-muted hover:border-edge-strong hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
