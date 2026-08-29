import {
  COUNTRIES,
  COUNTRIES_BY_CONTINENT,
  TOTAL_UN_MEMBERS,
  UN_MEMBER_CODES,
  getCountry,
} from '../data/countries/countries'
import { buildVisitedSet } from '../store/selectors'
import { CONTINENTS } from '../types'
import type { Continent, Country, TravelData, Visit } from '../types'

/**
 * Calcolo delle statistiche.
 *
 * Ogni totale nasce da `countries.ts`. Le feature del GeoJSON non vengono
 * MAI contate: quel file ha 242 poligoni, include territori senza codice ISO
 * e ne assegna uno solo a più feature (le dipendenze australiane). Usarlo
 * come denominatore darebbe numeri sbagliati e per giunta dipendenti dalla
 * risoluzione della mappa.
 */

export interface ContinentStat {
  continent: Continent
  visited: number
  total: number
  /** 0-100, arrotondato all'intero. */
  percentage: number
}

export interface TravelStats {
  /** Stati ONU visitati: il numeratore di "X/195". */
  visitedCount: number
  /** Sempre 195. */
  totalCount: number
  /** Percentuale di mondo visitata, 0-100 con un decimale. */
  worldPercentage: number
  /** Territori e dipendenze visitati, contati fuori dal 195. */
  territoriesVisited: number
  /** Un elemento per continente, ordinati per Paesi visitati decrescenti. */
  byContinent: ContinentStat[]
  /** Numero di viaggi registrati. */
  visitCount: number
  /** Paesi distinti che hanno almeno un viaggio. */
  countriesWithVisits: number
}

/** Totali per continente, limitati agli Stati ONU: la somma fa 195. */
const UN_TOTALS_BY_CONTINENT: Readonly<Record<Continent, number>> = COUNTRIES.reduce(
  (acc, country) => {
    if (UN_MEMBER_CODES.has(country.code)) acc[country.continent] += 1
    return acc
  },
  Object.fromEntries(CONTINENTS.map((continent) => [continent, 0])) as Record<Continent, number>,
)

function percentage(part: number, total: number, decimals = 0): number {
  if (total <= 0) return 0
  const value = (part / total) * 100
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function computeStats(data: TravelData): TravelStats {
  const visited = buildVisitedSet(data)

  let visitedCount = 0
  let territoriesVisited = 0
  const visitedByContinent = Object.fromEntries(
    CONTINENTS.map((continent) => [continent, 0]),
  ) as Record<Continent, number>

  for (const code of visited) {
    const country = getCountry(code)
    // Un codice che non è nella fonte di verità non entra in nessun conteggio.
    if (!country) continue

    if (UN_MEMBER_CODES.has(country.code)) {
      visitedCount += 1
      visitedByContinent[country.continent] += 1
    } else {
      territoriesVisited += 1
    }
  }

  const byContinent: ContinentStat[] = CONTINENTS.filter(
    (continent) => UN_TOTALS_BY_CONTINENT[continent] > 0,
  )
    .map((continent) => ({
      continent,
      visited: visitedByContinent[continent],
      total: UN_TOTALS_BY_CONTINENT[continent],
      percentage: percentage(visitedByContinent[continent], UN_TOTALS_BY_CONTINENT[continent]),
    }))
    .sort((a, b) => b.visited - a.visited || a.continent.localeCompare(b.continent))

  const countriesWithVisits = new Set(
    data.visits.map((visit) => visit.countryCode.toUpperCase()),
  ).size

  return {
    visitedCount,
    totalCount: TOTAL_UN_MEMBERS,
    worldPercentage: percentage(visitedCount, TOTAL_UN_MEMBERS, 1),
    territoriesVisited,
    byContinent,
    visitCount: data.visits.length,
    countriesWithVisits,
  }
}

export interface RecentVisit {
  visit: Visit
  country: Country | undefined
}

/** I viaggi più recenti, dal più recente al più vecchio. */
export function recentVisits(data: TravelData, limit = 5): RecentVisit[] {
  return [...data.visits]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((visit) => ({ visit, country: getCountry(visit.countryCode) }))
}

export interface ContinentBacklog {
  continent: Continent
  /** Stati ONU di quel continente non ancora visitati, in ordine alfabetico. */
  missing: Country[]
  visited: number
  total: number
}

/**
 * Quello che resta da vedere, continente per continente.
 *
 * Solo Stati ONU: è lo stesso insieme del denominatore 195. I territori
 * restano fuori — non fanno parte del conto e metterli in una lista di
 * "mancanti" suggerirebbe il contrario.
 *
 * Ordinati per quanti ne mancano, dal continente più vicino al completamento:
 * è l'ordine utile a chi sta decidendo dove andare.
 */
export function unvisitedByContinent(data: TravelData): ContinentBacklog[] {
  const visited = buildVisitedSet(data)

  return CONTINENTS.map((continent) => {
    const countries = (COUNTRIES_BY_CONTINENT[continent] ?? []).filter((country) =>
      UN_MEMBER_CODES.has(country.code),
    )
    const missing = countries
      .filter((country) => !visited.has(country.code))
      .sort((a, b) => a.name.localeCompare(b.name))
    return {
      continent,
      missing,
      visited: countries.length - missing.length,
      total: countries.length,
    }
  })
    .filter((backlog) => backlog.total > 0)
    .sort(
      (a, b) => a.missing.length - b.missing.length || a.continent.localeCompare(b.continent),
    )
}

export interface YearCount {
  year: number
  count: number
}

/**
 * Distribuzione dei viaggi per anno, dal più vecchio al più recente.
 *
 * Gli anni senza viaggi che cadono dentro l'intervallo ci sono lo stesso, con
 * zero: una distribuzione che salta gli anni vuoti fa sembrare continuo un
 * andamento che continuo non è.
 */
export function visitsPerYear(data: TravelData): YearCount[] {
  const counts = new Map<number, number>()
  for (const visit of data.visits) {
    const year = Number.parseInt(visit.date.slice(0, 4), 10)
    if (!Number.isInteger(year)) continue
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  if (counts.size === 0) return []

  const years = [...counts.keys()]
  const first = Math.min(...years)
  const last = Math.max(...years)

  const distribution: YearCount[] = []
  for (let year = first; year <= last; year += 1) {
    distribution.push({ year, count: counts.get(year) ?? 0 })
  }
  return distribution
}
