import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../data/countries/countries'
import {
  EMPTY_FILTERS,
  countByStatus,
  filterCountries,
  isTerritory,
  matchesQuery,
} from './countryFilters'
import type { Country } from '../types'

const none: ReadonlySet<string> = new Set()
const country = (code: string): Country => COUNTRIES.find((item) => item.code === code)!

describe('matchesQuery', () => {
  it('accetta tutto con la ricerca vuota', () => {
    expect(matchesQuery(country('IT'), '')).toBe(true)
    expect(matchesQuery(country('IT'), '   ')).toBe(true)
  })

  it('cerca nel nome, ignorando maiuscole', () => {
    expect(matchesQuery(country('IT'), 'ita')).toBe(true)
    expect(matchesQuery(country('IT'), 'ITALY')).toBe(true)
    expect(matchesQuery(country('IT'), 'france')).toBe(false)
  })

  it('cerca anche nel codice ISO', () => {
    expect(matchesQuery(country('JP'), 'jp')).toBe(true)
  })

  it('ignora gli accenti nella ricerca', () => {
    // "cote" deve trovare Côte d Ivoire, "reunion" deve trovare Réunion.
    expect(matchesQuery(country('CI'), 'cote')).toBe(true)
    expect(matchesQuery(country('RE'), 'reunion')).toBe(true)
  })
})

describe('filterCountries', () => {
  it('senza filtri restituisce tutti i Paesi in ordine alfabetico', () => {
    const result = filterCountries(COUNTRIES, EMPTY_FILTERS, none)
    expect(result).toHaveLength(COUNTRIES.length)
    expect(result[0]!.name).toBe('Afghanistan')
    expect(result.at(-1)!.name).toBe('Zimbabwe')
  })

  it('resta ordinato alfabeticamente anche con i filtri attivi', () => {
    const result = filterCountries(COUNTRIES, { ...EMPTY_FILTERS, continent: 'Oceania' }, none)
    const names = result.map((item) => item.name)
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names)
  })

  it('filtra per stato di visita', () => {
    const visited = new Set(['IT', 'JP'])
    expect(
      filterCountries(COUNTRIES, { ...EMPTY_FILTERS, status: 'visited' }, visited).map(
        (item) => item.code,
      ),
    ).toEqual(['IT', 'JP'])

    const notVisited = filterCountries(
      COUNTRIES,
      { ...EMPTY_FILTERS, status: 'not-visited' },
      visited,
    )
    expect(notVisited).toHaveLength(COUNTRIES.length - 2)
    expect(notVisited.some((item) => item.code === 'IT')).toBe(false)
  })

  it('filtra per continente', () => {
    const result = filterCountries(COUNTRIES, { ...EMPTY_FILTERS, continent: 'South America' }, none)
    expect(result.every((item) => item.continent === 'South America')).toBe(true)
    expect(result.some((item) => item.code === 'BR')).toBe(true)
  })

  it('combina ricerca, stato e continente', () => {
    const visited = new Set(['IT', 'FR', 'JP'])
    const result = filterCountries(
      COUNTRIES,
      { query: 'a', status: 'visited', continent: 'Europe' },
      visited,
    )
    expect(result.map((item) => item.code)).toEqual(['FR', 'IT'])
  })

  it('restituisce un elenco vuoto quando nulla combacia', () => {
    expect(filterCountries(COUNTRIES, { ...EMPTY_FILTERS, query: 'zzzz' }, none)).toEqual([])
  })
})

describe('countByStatus', () => {
  it('conta rispetto a ricerca e continente, non allo stato', () => {
    const visited = new Set(['IT', 'FR'])
    const counts = countByStatus(COUNTRIES, { ...EMPTY_FILTERS, continent: 'Europe' }, visited)

    expect(counts.visited).toBe(2)
    expect(counts.notVisited).toBe(counts.total - 2)
    expect(counts.total).toBeGreaterThan(40)
  })

  it('i contatori non cambiano al cambiare del tab selezionato', () => {
    const visited = new Set(['IT'])
    const all = countByStatus(COUNTRIES, { ...EMPTY_FILTERS, status: 'all' }, visited)
    const onlyVisited = countByStatus(COUNTRIES, { ...EMPTY_FILTERS, status: 'visited' }, visited)
    expect(all).toEqual(onlyVisited)
  })
})

describe('isTerritory', () => {
  it('distingue gli Stati ONU dai territori', () => {
    expect(isTerritory(country('IT'))).toBe(false)
    expect(isTerritory(country('PR'))).toBe(true)
    expect(isTerritory(country('XK'))).toBe(true)
  })
})
