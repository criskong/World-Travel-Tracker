import { describe, expect, it } from 'vitest'
import { groupVisitsByYear } from './tripsTimeline'
import type { Visit } from '../types'

function visit(id: string, date: string, countryCode = 'JP'): Visit {
  return { id, countryCode, date }
}

describe('groupVisitsByYear', () => {
  it('non produce gruppi senza viaggi', () => {
    expect(groupVisitsByYear([])).toEqual([])
  })

  it('raggruppa per anno, dal più recente', () => {
    const groups = groupVisitsByYear([
      visit('a', '2022-05-01'),
      visit('b', '2024-01-10'),
      visit('c', '2023-07-20'),
    ])
    expect(groups.map((group) => group.year)).toEqual(['2024', '2023', '2022'])
  })

  it('dentro ogni anno ordina dalla data più recente', () => {
    const groups = groupVisitsByYear([
      visit('a', '2024-01-10'),
      visit('b', '2024-11-30'),
      visit('c', '2024-06-15'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.entries.map((entry) => entry.visit.id)).toEqual(['b', 'c', 'a'])
  })

  it('a parità di data ordina per id, così il render è stabile', () => {
    const groups = groupVisitsByYear([visit('z', '2024-01-01'), visit('a', '2024-01-01')])
    expect(groups[0]!.entries.map((entry) => entry.visit.id)).toEqual(['a', 'z'])
  })

  it('risolve il Paese di ogni viaggio', () => {
    const groups = groupVisitsByYear([visit('a', '2024-01-01', 'FR')])
    expect(groups[0]!.entries[0]!.country?.name).toBe('France')
  })

  it('non perde i viaggi con una data malformata', () => {
    const groups = groupVisitsByYear([visit('a', '2024-01-01'), visit('b', 'boh')])
    expect(groups.flatMap((group) => group.entries)).toHaveLength(2)
    expect(groups.map((group) => group.year)).toContain('Unknown')
  })

  it('tiene insieme più viaggi dello stesso Paese nello stesso anno', () => {
    const groups = groupVisitsByYear([
      visit('a', '2024-03-01', 'JP'),
      visit('b', '2024-09-01', 'JP'),
      visit('c', '2024-06-01', 'IT'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.entries.map((entry) => entry.visit.id)).toEqual(['b', 'c', 'a'])
  })
})
