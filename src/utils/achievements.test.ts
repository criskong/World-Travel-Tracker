import { describe, expect, it } from 'vitest'
import { computeAchievements, continentCompletion, countUnMembersVisited } from './achievements'
import {
  COUNTRIES_BY_CONTINENT,
  TOTAL_UN_MEMBERS,
  UN_MEMBER_CODES,
  UN_MEMBER_LIST,
  isUnMember,
} from '../data/countries/countries'
import type { AchievementId } from './achievements'
import type { TravelData, Visit } from '../types'

/** Stato con `count` Stati ONU marcati a mano. */
function withCountries(count: number): TravelData {
  return { manuallyMarked: UN_MEMBER_LIST.slice(0, count), visits: [] }
}

function visit(countryCode: string, date = '2024-05-01'): Visit {
  return { id: `v-${countryCode}-${date}`, countryCode, date }
}

function byId(data: TravelData, id: AchievementId) {
  const found = computeAchievements(data).all.find((item) => item.id === id)
  if (!found) throw new Error(`achievement ${id} mancante`)
  return found
}

const THRESHOLDS: { id: AchievementId; target: number }[] = [
  { id: 'first-step', target: 1 },
  { id: 'explorer', target: 10 },
  { id: 'travel-addict', target: 25 },
  { id: 'world-traveler', target: 50 },
  { id: 'globe-trotter', target: 100 },
]

describe('soglie di conteggio', () => {
  it.each(THRESHOLDS)('$id si sblocca esattamente a $target', ({ id, target }) => {
    expect(byId(withCountries(target - 1), id).unlocked).toBe(false)
    expect(byId(withCountries(target), id).unlocked).toBe(true)
    expect(byId(withCountries(target + 1), id).unlocked).toBe(true)
  })

  it.each(THRESHOLDS)('$id mostra il progresso verso $target', ({ id, target }) => {
    const half = Math.floor(target / 2)
    const achievement = byId(withCountries(half), id)
    expect(achievement.current).toBe(half)
    expect(achievement.target).toBe(target)
    expect(achievement.progress).toBeCloseTo(half / target)
  })

  it('non va mai oltre il 100% ne oltre il target', () => {
    const achievement = byId(withCountries(120), 'explorer')
    expect(achievement.progress).toBe(1)
    expect(achievement.current).toBe(10)
  })

  it('a zero Paesi non e sbloccato niente', () => {
    const summary = computeAchievements({ manuallyMarked: [], visits: [] })
    expect(summary.unlocked).toEqual([])
    expect(summary.locked).toHaveLength(summary.total)
  })

  it('World Explorer chiede tutti e 195 gli Stati ONU', () => {
    expect(byId(withCountries(TOTAL_UN_MEMBERS - 1), 'world-explorer').unlocked).toBe(false)
    const complete = byId(withCountries(TOTAL_UN_MEMBERS), 'world-explorer')
    expect(complete.unlocked).toBe(true)
    expect(complete.target).toBe(195)
  })

  it('un Paese conta una volta sola, anche con marcatore e piu viaggi', () => {
    const data: TravelData = {
      manuallyMarked: ['JP'],
      visits: [visit('JP', '2023-01-01'), visit('JP', '2024-01-01')],
    }
    expect(countUnMembersVisited(data)).toBe(1)
    expect(byId(data, 'first-step').unlocked).toBe(true)
    expect(byId(data, 'explorer').current).toBe(1)
  })

  it('i viaggi sbloccano quanto i marcatori manuali', () => {
    const codes = UN_MEMBER_LIST.slice(0, 10)
    const fromVisits: TravelData = { manuallyMarked: [], visits: codes.map((code) => visit(code)) }
    expect(byId(fromVisits, 'explorer').unlocked).toBe(true)
  })
})

describe('il confine fra territori e Stati', () => {
  /**
   * La decisione presa: i territori NON contano per gli achievement, perche
   * il denominatore mostrato ovunque nell'app e 195.
   */
  const territories = ['GL', 'PR', 'RE', 'GU', 'AW', 'BM', 'KY', 'PF', 'NC', 'MQ']

  it('i territori non sono Stati ONU: la premessa del test', () => {
    for (const code of territories) {
      expect(isUnMember(code), `${code} non dovrebbe essere uno Stato ONU`).toBe(false)
    }
  })

  it('dieci territori non sbloccano Explorer', () => {
    const data: TravelData = { manuallyMarked: territories, visits: [] }
    expect(countUnMembersVisited(data)).toBe(0)
    expect(byId(data, 'first-step').unlocked).toBe(false)
    expect(byId(data, 'explorer').current).toBe(0)
  })

  it('un territorio non fa avanzare nemmeno di uno', () => {
    const withTerritory: TravelData = { manuallyMarked: ['JP', 'GL'], visits: [] }
    expect(countUnMembersVisited(withTerritory)).toBe(1)
    expect(byId(withTerritory, 'explorer').current).toBe(1)
  })

  it('un viaggio in un territorio non conta piu di un marcatore', () => {
    const data: TravelData = { manuallyMarked: [], visits: [visit('PR')] }
    expect(computeAchievements(data).unlocked).toEqual([])
  })

  it('i territori non entrano nei totali per continente', () => {
    const totals = continentCompletion({ manuallyMarked: [], visits: [] })
    const sum = totals.reduce((acc, item) => acc + item.total, 0)
    expect(sum).toBe(TOTAL_UN_MEMBERS)
  })
})

describe('Continent Master', () => {
  const oceania = (COUNTRIES_BY_CONTINENT.Oceania ?? []).filter((country) =>
    UN_MEMBER_CODES.has(country.code),
  )

  it('la premessa: Oceania ha degli Stati ONU', () => {
    expect(oceania.length).toBeGreaterThan(1)
  })

  it('si sblocca completando un continente intero', () => {
    const data: TravelData = { manuallyMarked: oceania.map((c) => c.code), visits: [] }
    const achievement = byId(data, 'continent-master')
    expect(achievement.unlocked).toBe(true)
    expect(achievement.detail).toEqual({ kind: 'continent-done', continents: ['Oceania'] })
  })

  it('resta bloccato se manca anche un solo Paese', () => {
    const data: TravelData = {
      manuallyMarked: oceania.slice(0, -1).map((c) => c.code),
      visits: [],
    }
    const achievement = byId(data, 'continent-master')
    expect(achievement.unlocked).toBe(false)
    expect(achievement.detail).toEqual({
      kind: 'continent-progress',
      continent: 'Oceania',
      current: oceania.length - 1,
      total: oceania.length,
    })
    expect(achievement.current).toBe(oceania.length - 1)
    expect(achievement.target).toBe(oceania.length)
  })

  it('un territorio del continente non basta a completarlo', () => {
    // La Nuova Caledonia e in Oceania ma non e uno Stato ONU: metterla al
    // posto di un membro mancante non deve completare il continente.
    const withoutLast = oceania.slice(0, -1).map((c) => c.code)
    const data: TravelData = { manuallyMarked: [...withoutLast, 'NC'], visits: [] }
    expect(byId(data, 'continent-master').unlocked).toBe(false)
  })

  it('punta al continente piu vicino al completamento', () => {
    const europe = (COUNTRIES_BY_CONTINENT.Europe ?? []).filter((country) =>
      UN_MEMBER_CODES.has(country.code),
    )
    const data: TravelData = {
      // Meta Oceania, tre Paesi europei: la quota di Oceania e piu alta.
      manuallyMarked: [
        ...oceania.slice(0, Math.ceil(oceania.length / 2)).map((c) => c.code),
        ...europe.slice(0, 3).map((c) => c.code),
      ],
      visits: [],
    }
    const detail = byId(data, 'continent-master').detail
    expect(detail.kind).toBe('continent-progress')
    if (detail.kind === 'continent-progress') expect(detail.continent).toBe('Oceania')
  })

  it('l Antartide non conta come continente completato', () => {
    const summary = computeAchievements({ manuallyMarked: [], visits: [] })
    expect(summary.unlocked).toEqual([])
    expect(
      continentCompletion({ manuallyMarked: [], visits: [] }).map((c) => c.continent),
    ).not.toContain('Antarctica')
  })
})

describe('riepilogo', () => {
  it('divide sbloccati e bloccati senza perderne nessuno', () => {
    const summary = computeAchievements(withCountries(30))
    expect(summary.unlocked.length + summary.locked.length).toBe(summary.total)
    expect(summary.unlockedCount).toBe(summary.unlocked.length)
    expect(summary.all).toHaveLength(7)
  })

  it('a 30 Paesi ha sbloccato le prime tre soglie', () => {
    const summary = computeAchievements(withCountries(30))
    expect(summary.unlocked.map((item) => item.id)).toEqual([
      'first-step',
      'explorer',
      'travel-addict',
    ])
  })

  it('indica come prossimo quello a cui manca meno', () => {
    // 40 Paesi: World Traveler e all 80%, Globe Trotter al 40%.
    expect(computeAchievements(withCountries(40)).next?.id).toBe('world-traveler')
  })

  it('non ha un prossimo quando sono tutti sbloccati', () => {
    const everything = computeAchievements(withCountries(TOTAL_UN_MEMBERS))
    expect(everything.locked).toEqual([])
    expect(everything.next).toBeNull()
    expect(everything.unlockedCount).toBe(everything.total)
  })

  it('non persiste niente: due chiamate sullo stesso stato danno lo stesso esito', () => {
    const data = withCountries(12)
    expect(computeAchievements(data)).toEqual(computeAchievements(data))
  })
})
