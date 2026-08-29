import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeStats, recentVisits, unvisitedByContinent, visitsPerYear } from './stats'
import {
  COUNTRIES,
  COUNTRIES_BY_CONTINENT,
  TOTAL_COUNTRIES,
  TOTAL_UN_MEMBERS,
  UN_MEMBER_CODES,
  isUnMember,
} from '../data/countries/countries'
import { GEOJSON_FILENAME } from '../data/countries/dataset'
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
      readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8'),
    ) as { features: unknown[] }

    expect(geojson.features.length).toBe(242)
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

describe('unvisitedByContinent', () => {
  it('al primo avvio manca tutto: la somma fa 195', () => {
    const backlog = unvisitedByContinent(empty)
    const missing = backlog.reduce((total, item) => total + item.missing.length, 0)
    expect(missing).toBe(TOTAL_UN_MEMBERS)
  })

  it('esclude i territori dai mancanti', () => {
    const codes = unvisitedByContinent(empty).flatMap((item) =>
      item.missing.map((country) => country.code),
    )
    expect(codes.every((code) => isUnMember(code))).toBe(true)
    expect(codes).not.toContain('GL')
    expect(codes).not.toContain('PR')
  })

  it('non elenca un Paese gia visitato', () => {
    const backlog = unvisitedByContinent({ manuallyMarked: ['JP'], visits: [] })
    const asia = backlog.find((item) => item.continent === 'Asia')
    expect(asia?.missing.some((country) => country.code === 'JP')).toBe(false)
    expect(asia?.visited).toBe(1)
  })

  it('conta come visitato anche chi ha solo un viaggio', () => {
    const backlog = unvisitedByContinent({
      manuallyMarked: [],
      visits: [visit({ countryCode: 'IT' })],
    })
    const europe = backlog.find((item) => item.continent === 'Europe')
    expect(europe?.missing.some((country) => country.code === 'IT')).toBe(false)
  })

  it('un territorio visitato non riduce i mancanti', () => {
    const before = unvisitedByContinent(empty)
    const after = unvisitedByContinent({ manuallyMarked: ['GL'], visits: [] })
    expect(after.map((item) => item.missing.length)).toEqual(
      before.map((item) => item.missing.length),
    )
  })

  it('non include continenti senza Stati ONU', () => {
    expect(unvisitedByContinent(empty).map((item) => item.continent)).not.toContain('Antarctica')
  })

  it('mette per primo il continente piu vicino al completamento', () => {
    const oceania = (COUNTRIES_BY_CONTINENT.Oceania ?? []).filter((country) =>
      UN_MEMBER_CODES.has(country.code),
    )
    const data: TravelData = {
      manuallyMarked: oceania.slice(0, -1).map((country) => country.code),
      visits: [],
    }
    const backlog = unvisitedByContinent(data)
    expect(backlog[0]?.continent).toBe('Oceania')
    expect(backlog[0]?.missing).toHaveLength(1)
  })

  it('ordina i mancanti per nome', () => {
    const africa = unvisitedByContinent(empty).find((item) => item.continent === 'Africa')
    const names = africa?.missing.map((country) => country.name) ?? []
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('visited piu missing fa sempre il totale del continente', () => {
    for (const item of unvisitedByContinent({ manuallyMarked: ['JP', 'IT', 'FR'], visits: [] })) {
      expect(item.visited + item.missing.length).toBe(item.total)
    }
  })
})

describe('visitsPerYear', () => {
  it('senza viaggi non c e distribuzione', () => {
    expect(visitsPerYear(empty)).toEqual([])
  })

  it('conta i viaggi di ogni anno', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [
        visit({ id: 'a', date: '2023-01-10' }),
        visit({ id: 'b', date: '2023-08-02' }),
        visit({ id: 'c', date: '2024-03-30' }),
      ],
    }
    expect(visitsPerYear(data)).toEqual([
      { year: 2023, count: 2 },
      { year: 2024, count: 1 },
    ])
  })

  it('riempie di zeri gli anni vuoti dentro l intervallo', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [visit({ id: 'a', date: '2020-06-01' }), visit({ id: 'b', date: '2023-06-01' })],
    }
    expect(visitsPerYear(data)).toEqual([
      { year: 2020, count: 1 },
      { year: 2021, count: 0 },
      { year: 2022, count: 0 },
      { year: 2023, count: 1 },
    ])
  })

  it('parte dal piu vecchio anche se i viaggi sono in disordine', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [visit({ id: 'a', date: '2024-01-01' }), visit({ id: 'b', date: '2022-01-01' })],
    }
    expect(visitsPerYear(data).map((item) => item.year)).toEqual([2022, 2023, 2024])
  })

  it('un solo anno da un solo elemento', () => {
    const data: TravelData = { manuallyMarked: [], visits: [visit({ date: '2024-05-01' })] }
    expect(visitsPerYear(data)).toEqual([{ year: 2024, count: 1 }])
  })

  it('la somma dei conteggi e il numero di viaggi', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [
        visit({ id: 'a', date: '2019-01-01' }),
        visit({ id: 'b', date: '2021-01-01' }),
        visit({ id: 'c', date: '2021-07-01' }),
        visit({ id: 'd', date: '2024-01-01' }),
      ],
    }
    const total = visitsPerYear(data).reduce((sum, item) => sum + item.count, 0)
    expect(total).toBe(data.visits.length)
  })
})
