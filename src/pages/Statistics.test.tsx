// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Statistics from './Statistics'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'
import { TOTAL_UN_MEMBERS, UN_MEMBER_LIST, isUnMember } from '../data/countries/countries'

/**
 * I numeri di questa pagina devono venire da `countries.ts`, mai dalle 242
 * feature del GeoJSON (CLAUDE.md, Dati geografici). I test lo verificano
 * confrontando i totali con `UN_MEMBER_LIST`.
 */

beforeEach(async () => {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
  })
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  cleanup()
  await closeDatabase()
})

/** I testi delle barre per continente, che portano visitati e totale. */
function continentLabels(): string[] {
  const section = screen.getByRole('region', { name: 'By continent' })
  return within(section)
    .getAllByRole('img')
    .map((bar) => bar.getAttribute('aria-label') ?? '')
}

describe('Statistics', () => {
  it('al primo avvio mostra un empty state, non degli zeri sparsi', () => {
    render(<Statistics />)
    expect(screen.getByText(/Nothing to measure yet/i)).toBeDefined()
    expect(screen.getByText(/0 \/ 195 countries/)).toBeDefined()
    expect(screen.queryByRole('region', { name: 'By continent' })).toBeNull()
  })

  it('il denominatore e 195, non le 242 feature del GeoJSON', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Statistics />)

    expect(screen.getByText(`/ ${TOTAL_UN_MEMBERS}`)).toBeDefined()
    expect(TOTAL_UN_MEMBERS).toBe(195)
    expect(screen.queryByText(/242/)).toBeNull()
  })

  it('i totali per continente sommano esattamente 195', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Statistics />)

    const totals = continentLabels().map((label) => {
      const match = /of (\d+) countries/.exec(label)
      return match ? Number(match[1]) : 0
    })
    expect(totals.reduce((sum, value) => sum + value, 0)).toBe(TOTAL_UN_MEMBERS)
  })

  it('un territorio visitato non entra nel conto dei 195', async () => {
    await useTravelStore.getState().markVisited('GL')
    render(<Statistics />)

    expect(isUnMember('GL')).toBe(false)
    // Zero Paesi sui 195...
    expect(screen.getByText('0 of 195 countries · 0% of the world')).toBeDefined()
    // ...ma un territorio, contato a parte.
    const territoryTile = screen.getByText('beyond the 195').closest('p')
    expect(territoryTile?.textContent).toBe('1beyond the 195')
  })

  it('conta un Paese visitato nel suo continente', async () => {
    await useTravelStore.getState().markVisited('JP')
    render(<Statistics />)

    const asia = continentLabels().find((label) => label.startsWith('Asia'))
    expect(asia).toMatch(/^Asia: 1 of \d+ countries/)
  })

  describe('Still to visit', () => {
    it('al primo Paese marcato ne restano 194', async () => {
      await useTravelStore.getState().markVisited('IT')
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Still to visit' })
      expect(within(section).getByText(`${TOTAL_UN_MEMBERS - 1} left`)).toBeDefined()
    })

    it('non elenca il Paese appena visitato', async () => {
      await useTravelStore.getState().markVisited('IT')
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Still to visit' })
      expect(within(section).queryByText('Italy')).toBeNull()
      expect(within(section).getByText('France')).toBeDefined()
    })

    it('non elenca i territori: non fanno parte dei 195', async () => {
      await useTravelStore.getState().markVisited('IT')
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Still to visit' })
      expect(within(section).queryByText('Greenland')).toBeNull()
      expect(within(section).queryByText('Puerto Rico')).toBeNull()
    })

    it('quando non manca piu niente lo dice', async () => {
      for (const code of UN_MEMBER_LIST) {
        await useTravelStore.getState().markVisited(code)
      }
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Still to visit' })
      expect(within(section).getByText(/visited every one of the 195/i)).toBeDefined()
    })
  })

  describe('Trips by year', () => {
    it('senza viaggi invita ad aggiungerne uno', async () => {
      await useTravelStore.getState().markVisited('IT')
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Trips by year' })
      expect(within(section).getByText(/No trips recorded yet/i)).toBeDefined()
    })

    it('disegna una barra per anno, anni vuoti compresi', async () => {
      await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2021-04-01' })
      await useTravelStore.getState().addVisit({ countryCode: 'FR', date: '2024-06-01' })
      await useTravelStore.getState().addVisit({ countryCode: 'ES', date: '2024-08-01' })
      render(<Statistics />)

      const section = screen.getByRole('region', { name: 'Trips by year' })
      const bars = within(section).getAllByRole('listitem')
      // 2021, 2022, 2023, 2024: i due anni senza viaggi ci sono lo stesso.
      expect(bars).toHaveLength(4)
      expect(bars[0]?.getAttribute('title')).toBe('2021: 1 trip')
      expect(bars[1]?.getAttribute('title')).toBe('2022: 0 trips')
      expect(bars[3]?.getAttribute('title')).toBe('2024: 2 trips')
      expect(within(section).getByText('3 trips')).toBeDefined()
    })
  })
})
