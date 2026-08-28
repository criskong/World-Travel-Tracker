import { getCountry } from '../data/countries/countries'
import type { Country, Visit } from '../types'

/** Raggruppamento della timeline dei viaggi. Logica pura. */

export interface TimelineEntry {
  visit: Visit
  country: Country | undefined
}

export interface TimelineYear {
  year: string
  entries: TimelineEntry[]
}

/** L'anno di una data `YYYY-MM-DD`. Le date malformate finiscono in "Unknown". */
function yearOf(date: string): string {
  return /^\d{4}-/.test(date) ? date.slice(0, 4) : 'Unknown'
}

/**
 * Viaggi raggruppati per anno, dal più recente al più vecchio, e dentro
 * ogni anno dalla data più recente. A parità di data l'id decide, così
 * l'ordine è stabile fra un render e l'altro.
 */
export function groupVisitsByYear(visits: readonly Visit[]): TimelineYear[] {
  const byYear = new Map<string, TimelineEntry[]>()

  for (const visit of visits) {
    const year = yearOf(visit.date)
    const entry: TimelineEntry = { visit, country: getCountry(visit.countryCode) }
    const bucket = byYear.get(year)
    if (bucket) bucket.push(entry)
    else byYear.set(year, [entry])
  }

  return [...byYear.entries()]
    .map(([year, entries]) => ({
      year,
      entries: entries.sort(
        (a, b) => b.visit.date.localeCompare(a.visit.date) || a.visit.id.localeCompare(b.visit.id),
      ),
    }))
    .sort((a, b) => b.year.localeCompare(a.year))
}
