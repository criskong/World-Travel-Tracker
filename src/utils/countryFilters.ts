import { isUnMember } from '../data/countries/countries'
import type { Continent, Country } from '../types'

/**
 * Filtri della pagina Countries. Logica pura: la pagina si limita a
 * raccogliere i controlli e a passare qui i valori.
 */

export type VisitStatusFilter = 'all' | 'visited' | 'not-visited'

export interface CountryFilters {
  /** Ricerca libera su nome e codice ISO. */
  query: string
  status: VisitStatusFilter
  /** `null` = tutti i continenti. */
  continent: Continent | null
}

export const EMPTY_FILTERS: CountryFilters = {
  query: '',
  status: 'all',
  continent: null,
}

/** Confronto insensibile a maiuscole e accenti: "cote" trova "Côte d'Ivoire". */
function foldCase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Come si chiama un Paese ai fini di ricerca e ordinamento.
 * Il default e il nome inglese di `countries.ts`; la pagina passa quello
 * tradotto. Le due fonti convivono di proposito nella ricerca: chi ha l'app in
 * italiano puo comunque digitare "Germany" e trovare la Germania, ed e un
 * comportamento che si nota solo quando manca.
 */
export type CountryNaming = (country: Country) => string

const DEFAULT_NAMING: CountryNaming = (country) => country.name

export function matchesQuery(
  country: Country,
  query: string,
  naming: CountryNaming = DEFAULT_NAMING,
): boolean {
  const needle = foldCase(query)
  if (needle.length === 0) return true
  return (
    foldCase(naming(country)).includes(needle) ||
    foldCase(country.name).includes(needle) ||
    foldCase(country.code).includes(needle)
  )
}

export function filterCountries(
  countries: readonly Country[],
  filters: CountryFilters,
  visited: ReadonlySet<string>,
  naming: CountryNaming = DEFAULT_NAMING,
  collate: (a: string, b: string) => number = (a, b) => a.localeCompare(b, 'en'),
): Country[] {
  return countries
    .filter((country) => {
      if (filters.continent !== null && country.continent !== filters.continent) return false
      if (filters.status === 'visited' && !visited.has(country.code)) return false
      if (filters.status === 'not-visited' && visited.has(country.code)) return false
      return matchesQuery(country, filters.query, naming)
    })
    .sort((a, b) => collate(naming(a), naming(b)))
}

export interface CountryCounts {
  total: number
  visited: number
  notVisited: number
}

/** Contatori dei tab, calcolati sull'insieme già ristretto da ricerca e continente. */
export function countByStatus(
  countries: readonly Country[],
  filters: CountryFilters,
  visited: ReadonlySet<string>,
  naming: CountryNaming = DEFAULT_NAMING,
): CountryCounts {
  const scoped = countries.filter(
    (country) =>
      (filters.continent === null || country.continent === filters.continent) &&
      matchesQuery(country, filters.query, naming),
  )
  const visitedCount = scoped.filter((country) => visited.has(country.code)).length
  return {
    total: scoped.length,
    visited: visitedCount,
    notVisited: scoped.length - visitedCount,
  }
}

/** `true` se il Paese è fuori dai 195: mostra il badge "territory". */
export function isTerritory(country: Country): boolean {
  return !isUnMember(country.code)
}
