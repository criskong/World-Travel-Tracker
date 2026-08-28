import type { TravelData, Visit } from '../types'

/**
 * Selettori derivati.
 *
 * `isVisited` NON è stato persistito: si ricalcola sempre da
 * `manuallyMarked` + `visits`. Se le due fonti divergessero, l'unica verità
 * resterebbe comunque quella salvata su IndexedDB.
 */

function normalize(code: string): string {
  return code.trim().toUpperCase()
}

/** Un Paese è visitato se marcato a mano OPPURE se ha almeno un viaggio. */
export function isVisited(data: TravelData, code: string): boolean {
  const normalized = normalize(code)
  return (
    data.manuallyMarked.some((marked) => normalize(marked) === normalized) ||
    data.visits.some((visit) => normalize(visit.countryCode) === normalized)
  )
}

/** Insieme dei Paesi visitati. Da usare quando servono più controlli di fila. */
export function buildVisitedSet(data: TravelData): ReadonlySet<string> {
  const visited = new Set<string>()
  for (const code of data.manuallyMarked) visited.add(normalize(code))
  for (const visit of data.visits) visited.add(normalize(visit.countryCode))
  return visited
}

/** Numero di Paesi distinti visitati. Base per le percentuali. */
export function countVisited(data: TravelData): number {
  return buildVisitedSet(data).size
}

/** Viaggi di un Paese, dal più recente al più vecchio. */
export function visitsForCountry(data: TravelData, code: string): Visit[] {
  const normalized = normalize(code)
  return data.visits
    .filter((visit) => normalize(visit.countryCode) === normalized)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * `true` se togliendo il marcatore manuale il Paese resterebbe comunque
 * visitato perché ha dei viaggi registrati.
 */
export function hasVisits(data: TravelData, code: string): boolean {
  const normalized = normalize(code)
  return data.visits.some((visit) => normalize(visit.countryCode) === normalized)
}
