import { describe, expect, it } from 'vitest'
import {
  buildVisitedSet,
  countVisited,
  hasVisits,
  isVisited,
  visitsForCountry,
} from './selectors'
import type { TravelData, Visit } from '../types'

function visit(overrides: Partial<Visit> = {}): Visit {
  return { id: 'v1', countryCode: 'JP', date: '2024-05-01', ...overrides }
}

const empty: TravelData = { manuallyMarked: [], visits: [] }

describe('isVisited', () => {
  it('è falso al primo avvio: nessun seed data', () => {
    expect(isVisited(empty, 'IT')).toBe(false)
    expect(countVisited(empty)).toBe(0)
  })

  it('è vero per un Paese marcato a mano', () => {
    expect(isVisited({ manuallyMarked: ['IT'], visits: [] }, 'IT')).toBe(true)
  })

  it('è vero per un Paese che ha almeno un viaggio, senza marcatore manuale', () => {
    expect(isVisited({ manuallyMarked: [], visits: [visit()] }, 'JP')).toBe(true)
  })

  it('resta vero se il Paese è sia marcato sia visitato', () => {
    const data: TravelData = { manuallyMarked: ['JP'], visits: [visit()] }
    expect(isVisited(data, 'JP')).toBe(true)
    expect(countVisited(data)).toBe(1)
  })

  it('è falso per un Paese assente da entrambe le fonti', () => {
    expect(isVisited({ manuallyMarked: ['IT'], visits: [visit()] }, 'FR')).toBe(false)
  })

  it('ignora maiuscole/minuscole e spazi', () => {
    const data: TravelData = { manuallyMarked: [' it '], visits: [] }
    expect(isVisited(data, 'it')).toBe(true)
    expect(isVisited(data, 'IT')).toBe(true)
  })
})

describe('buildVisitedSet', () => {
  it('unisce le due fonti senza duplicati', () => {
    const data: TravelData = {
      manuallyMarked: ['IT', 'JP'],
      visits: [visit(), visit({ id: 'v2', countryCode: 'FR', date: '2023-01-01' })],
    }
    expect([...buildVisitedSet(data)].sort()).toEqual(['FR', 'IT', 'JP'])
    expect(countVisited(data)).toBe(3)
  })

  it('conta una sola volta più viaggi nello stesso Paese', () => {
    const data: TravelData = {
      manuallyMarked: [],
      visits: [visit(), visit({ id: 'v2', date: '2025-02-02' })],
    }
    expect(countVisited(data)).toBe(1)
  })
})

describe('visitsForCountry / hasVisits', () => {
  const data: TravelData = {
    manuallyMarked: ['IT'],
    visits: [visit({ id: 'a', date: '2023-01-01' }), visit({ id: 'b', date: '2025-01-01' })],
  }

  it('restituisce i viaggi dal più recente al più vecchio', () => {
    expect(visitsForCountry(data, 'JP').map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('distingue un Paese con viaggi da uno solo marcato a mano', () => {
    expect(hasVisits(data, 'JP')).toBe(true)
    expect(hasVisits(data, 'IT')).toBe(false)
  })
})
