import { COUNTRIES_BY_CONTINENT, TOTAL_UN_MEMBERS, UN_MEMBER_CODES } from '../data/countries/countries'
import { buildVisitedSet } from '../store/selectors'
import { CONTINENTS } from '../types'
import type { Continent, TravelData } from '../types'

/**
 * Sblocco degli achievement.
 *
 * Logica pura, calcolata dallo stato a ogni render. NON viene mai persistita:
 * sarebbe stato derivato, esattamente come `isVisited`, e due fonti per la
 * stessa verità sono la premessa di una divergenza (CLAUDE.md, Modello dati).
 * Un effetto collaterale gradito: importare un backup ricalcola tutto da solo.
 *
 * DECISIONE — I TERRITORI NON CONTANO.
 * Le soglie guardano solo i 195 Stati ONU (`UN_MEMBER_LIST`), gli stessi del
 * denominatore mostrato ovunque nell'app. Contare anche Groenlandia, Porto
 * Rico o la Riunione renderebbe "50 / 195" e "World Traveler a 50" due numeri
 * diversi che si contraddicono a vicenda sulla stessa schermata. I territori
 * visitati restano contati a parte, come in Home: non spariscono, ma non
 * fanno avanzare le medaglie.
 */

export type AchievementId =
  | 'first-step'
  | 'explorer'
  | 'travel-addict'
  | 'world-traveler'
  | 'globe-trotter'
  | 'continent-master'
  | 'world-explorer'

export interface Achievement {
  id: AchievementId
  name: string
  /** Cosa serve per sbloccarlo, in una riga. */
  description: string
  unlocked: boolean
  /** Quanto si è fatto, nella stessa unità di `target`. */
  current: number
  target: number
  /** Da 0 a 1, tagliato a 1. */
  progress: number
  /** Dove si è, in parole: "7 of 10 countries". */
  detail: string
}

export interface AchievementsSummary {
  /** Tutti, nell'ordine di difficoltà crescente. */
  all: Achievement[]
  unlocked: Achievement[]
  locked: Achievement[]
  /** Il bloccato più vicino, o `null` quando sono tutti sbloccati. */
  next: Achievement | null
  unlockedCount: number
  total: number
}

/** Soglie in Stati ONU visitati. */
const COUNT_MILESTONES: { id: AchievementId; name: string; target: number }[] = [
  { id: 'first-step', name: 'First Step', target: 1 },
  { id: 'explorer', name: 'Explorer', target: 10 },
  { id: 'travel-addict', name: 'Travel Addict', target: 25 },
  { id: 'world-traveler', name: 'World Traveler', target: 50 },
  { id: 'globe-trotter', name: 'Globe Trotter', target: 100 },
]

export interface ContinentCompletion {
  continent: Continent
  visited: number
  total: number
  complete: boolean
}

/**
 * Avanzamento su ogni continente, contando solo Stati ONU.
 * L'Antartide non compare: non ha Stati ONU, quindi sarebbe uno 0 / 0
 * "completo" al primo avvio.
 */
export function continentCompletion(data: TravelData): ContinentCompletion[] {
  const visited = buildVisitedSet(data)

  return CONTINENTS.map((continent) => {
    const members = (COUNTRIES_BY_CONTINENT[continent] ?? []).filter((country) =>
      UN_MEMBER_CODES.has(country.code),
    )
    const count = members.filter((country) => visited.has(country.code)).length
    return { continent, visited: count, total: members.length, complete: count === members.length }
  }).filter((item) => item.total > 0)
}

/** Stati ONU distinti visitati: il numero su cui poggiano tutte le soglie. */
export function countUnMembersVisited(data: TravelData): number {
  let count = 0
  for (const code of buildVisitedSet(data)) {
    if (UN_MEMBER_CODES.has(code)) count += 1
  }
  return count
}

function make(
  id: AchievementId,
  name: string,
  description: string,
  current: number,
  target: number,
  detail: string,
): Achievement {
  const capped = Math.min(current, target)
  return {
    id,
    name,
    description,
    unlocked: current >= target,
    current: capped,
    target,
    progress: target <= 0 ? 0 : Math.min(1, current / target),
    detail,
  }
}

/**
 * Il continente più vicino a essere completato: quello con la quota più alta,
 * a parità quello a cui mancano meno Paesi. Con zero Paesi visitati vince il
 * più piccolo, che è anche il consiglio giusto da dare.
 */
function closestContinent(completion: ContinentCompletion[]): ContinentCompletion | null {
  if (completion.length === 0) return null
  return [...completion].sort((a, b) => {
    const done = b.visited / b.total - a.visited / a.total
    if (done !== 0) return done
    const remaining = a.total - a.visited - (b.total - b.visited)
    if (remaining !== 0) return remaining
    return a.continent.localeCompare(b.continent)
  })[0]!
}

export function computeAchievements(data: TravelData): AchievementsSummary {
  const visitedCount = countUnMembersVisited(data)
  const completion = continentCompletion(data)
  const mastered = completion.filter((item) => item.complete)

  const all: Achievement[] = COUNT_MILESTONES.map((milestone) =>
    make(
      milestone.id,
      milestone.name,
      `Visit ${milestone.target} ${milestone.target === 1 ? 'country' : 'countries'}`,
      visitedCount,
      milestone.target,
      `${Math.min(visitedCount, milestone.target)} of ${milestone.target} countries`,
    ),
  )

  // Continent Master si misura sul continente più vicino: è quello che dice
  // davvero quanto manca alla medaglia.
  const focus = mastered[0] ?? closestContinent(completion)
  all.push(
    make(
      'continent-master',
      'Continent Master',
      'Visit every country of a single continent',
      mastered.length > 0 ? 1 : (focus?.visited ?? 0),
      mastered.length > 0 ? 1 : (focus?.total ?? 1),
      mastered.length > 0
        ? `${mastered.map((item) => item.continent).join(', ')} completed`
        : focus
          ? `${focus.visited} of ${focus.total} in ${focus.continent}`
          : 'No continent available',
    ),
  )

  all.push(
    make(
      'world-explorer',
      'World Explorer',
      'Visit every country in the world',
      visitedCount,
      TOTAL_UN_MEMBERS,
      `${visitedCount} of ${TOTAL_UN_MEMBERS} countries`,
    ),
  )

  const unlocked = all.filter((item) => item.unlocked)
  const locked = all.filter((item) => !item.unlocked)

  // Il "prossimo" è quello a cui manca meno, non il primo dell'elenco:
  // Continent Master può essere vicinissimo mentre Globe Trotter è lontano.
  const next =
    locked.length === 0
      ? null
      : locked.reduce((best, item) => (item.progress > best.progress ? item : best))

  return {
    all,
    unlocked,
    locked,
    next,
    unlockedCount: unlocked.length,
    total: all.length,
  }
}
