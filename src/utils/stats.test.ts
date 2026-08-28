import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeStats, recentVisits } from './stats'
import {
  COUNTRIES,
  TOTAL_COUNTRIES,
  TOTAL_UN_MEMBERS,
  UN_MEMBER_CODES,
  isUnMember,
} from '../data/countries/countries'
import type { TravelData, Visit } from '../types'

function visit(overrides: Partial<Visit> = {}): Visit {
  return { id: 'v1', countryCode: 'JP', date: '2024-05-01', ...overrides }
}

const empty: TravelData = { manuallyMarked: [], visits: [] }

describe('elenco degli Stati ONU', () => {
  it('contiene esattamente 195 Stati', () => {
    expect(TOTAL_UN_MEMBERS).toBe(195)
  })

  it('ogni codice esiste nella fonte di verità', () => {
    const known = new Set(COUNTRIES.map((country) => country.code))
    const missing = [...UN_MEMBER_CODES].filter((code) => !known.has(code))
    expect(missing).toEqual([])
  })

  it('territori e dipendenze restano fuori dal 195 ma dentro COUNTRIES', () => {
    expect(isUnMember('IT')).toBe(true)
    expect(isUnMember('PR')).toBe(false)
    expect(isUnMember('GL')).toBe(false)
    expect(isUnMember('XK')).toBe(false)
    expect(TOTAL_COUNTRIES - TOTAL_UN_MEMBERS).toBe(55)
  })
})

describe('computeStats: primo avvio', () => {
  it('parte da zero, senza divisioni per zero', () => {
    const stats = computeStats(empty)
    expect(stats.visitedCount).toBe(0)
    expect(stats.totalCount).toBe(195)
    expect(stats.worldPercentage).toBe(0)
    expect(stats.territoriesVisited).toBe(0)
    expect(stats.visitCount).toBe(0)
    expect(stats.byContinent.every((item) => item.visited === 0)).toBe(true)
  })

  it('i totali per continente sommano a 195', () => {
    const stats = computeStats(empty)
    const total = stats.byContinent.reduce((sum, item) => sum + item.total, 0)
    expect(total).toBe(195)
  })

  it("non include l'Antartide fra i continenti: nessuno Stato ONU", () => {
    const stats = computeStats(empty)
    expect(stats.byContinent.map((item) => item.continent)).not.toContain('Antarctica')
    expect(stats.byContinent).toHaveLength(6)
  })
})

describe('computeStats: conteggi', () => {
  it('conta i Paesi marcati a mano', () => {
    const stats = computeStats({ manuallyMarked: ['IT', 'FR', 'JP'], visits: [] })
    expect(stats.visitedCount).toBe(3)
    expect(stats.worldPercentage).toBe(1.5)
  })

  it('conta anche i Paesi visitati solo tramite viaggio', () => {
    const stats = computeStats({ manuallyMarked: [], visits: [visit()] })
    expect(stats.visitedCount).toBe(1)
  })

  it('non conta due volte un Paese sia marcato sia con viaggi', () => {
    const stats = computeStats({ manuallyMarked: ['JP'], visits: [visit(), visit({ id: 'v2' })] })
    expect(stats.visitedCount).toBe(1)
    expect(stats.visitCount).toBe(2)
    expect(stats.countriesWithVisits).toBe(1)
  })

  it('tiene i territori fuori dal 195 e li conta a parte', () => {
    const stats = computeStats({ manuallyMarked: ['IT', 'PR', 'GL'], visits: [] })
    expect(stats.visitedCount).toBe(1)
    expect(stats.territoriesVisited).toBe(2)
  })

  it('ignora i codici non presenti nella fonte di verità', () => {
    const stats = computeStats({ manuallyMarked: ['IT', 'ZZ'], visits: [] })
    expect(stats.visitedCount).toBe(1)
    expect(stats.territoriesVisited).toBe(0)
  })

  it('arriva al 100% marcando tutti i 195', () => {
    const stats = computeStats({ manuallyMarked: [...UN_MEMBER_CODES], visits: [] })
    expect(stats.visitedCount).toBe(195)
    expect(stats.worldPercentage).toBe(100)
    for (const item of stats.byContinent) {
      expect(item.visited).toBe(item.total)
      expect(item.percentage).toBe(100)
    }
  })
})

describe('computeStats: per continente', () => {
  it('assegna ogni Paese al proprio continente', () => {
    const stats = computeStats({ manuallyMarked: ['IT', 'FR', 'JP', 'BR'], visits: [] })
    const byName = Object.fromEntries(stats.byContinent.map((item) => [item.continent, item]))

    expect(byName.Europe!.visited).toBe(2)
    expect(byName.Asia!.visited).toBe(1)
    expect(byName['South America']!.visited).toBe(1)
    expect(byName.Africa!.visited).toBe(0)
  })

  it('ordina per Paesi visitati decrescenti', () => {
    const stats = computeStats({ manuallyMarked: ['IT', 'FR', 'JP'], visits: [] })
    expect(stats.byContinent[0]!.continent).toBe('Europe')
  })

  it('non conta i territori nel totale del continente', () => {
    // Porto Rico è North America in COUNTRIES ma non è uno Stato ONU.
    const stats = computeStats({ manuallyMarked: ['PR'], visits: [] })
    const northAmerica = stats.byContinent.find((item) => item.continent === 'North America')
    expect(northAmerica!.visited).toBe(0)
    expect(northAmerica!.total).toBe(23)
  })
})

describe('i totali non dipendono dal GeoJSON', () => {
  it('il dataset ha meno poligoni dei Paesi tracciati: non è un denominatore valido', () => {
    const geojson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/countries-110m.geojson'), 'utf8'),
    ) as { features: unknown[] }

    expect(geojson.features.length).toBe(177)
    expect(computeStats(empty).totalCount).toBe(195)
    expect(computeStats(empty).totalCount).not.toBe(geojson.features.length)
  })
})

describe('recentVisits', () => {
  it('restituisce i viaggi dal più recente, con il Paese risolto', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [
        visit({ id: 'a', countryCode: 'IT', date: '2023-01-01' }),
        visit({ id: 'b', countryCode: 'FR', date: '2025-06-01' }),
        visit({ id: 'c', countryCode: 'JP', date: '2024-03-01' }),
      ],
    }

    const recent = recentVisits(data, 2)
    expect(recent.map((item) => item.visit.id)).toEqual(['b', 'c'])
    expect(recent[0]!.country?.name).toBe('France')
  })

  it('restituisce un elenco vuoto senza viaggi', () => {
    expect(recentVisits(empty)).toEqual([])
  })
})
