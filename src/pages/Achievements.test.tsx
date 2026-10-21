// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Achievements from './Achievements'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'
import { UN_MEMBER_LIST } from '../data/countries/countries'

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

async function markCountries(count: number): Promise<void> {
  for (const code of UN_MEMBER_LIST.slice(0, count)) {
    await useTravelStore.getState().markVisited(code)
  }
}

/** I nomi degli achievement dentro una sezione. */
function namesIn(section: string): string[] {
  const region = screen.getByRole('region', { name: section })
  return within(region)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '')
}

describe('Achievements', () => {
  it('al primo avvio non ne ha sbloccato nessuno', () => {
    render(<Achievements />)

    expect(screen.getByText(/0 of 7 unlocked/)).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Unlocked' })).toBeNull()
    expect(namesIn('Locked')).toHaveLength(7)
  })

  it('dice che il conteggio e sui 195 Stati ONU', () => {
    render(<Achievements />)
    expect(screen.getByText(/based on the 195 UN states/i)).toBeDefined()
  })

  it('propone come prossimo First Step, con la barra a zero', () => {
    render(<Achievements />)

    const next = screen.getByRole('region', { name: 'Next achievement' })
    expect(within(next).getByRole('heading', { level: 2 }).textContent).toBe('First Step')
    expect(within(next).getByText('0 of 1 visited')).toBeDefined()
    expect(within(next).getByText(/1 to go · 0%/)).toBeDefined()
  })

  it('sblocca First Step al primo Paese', async () => {
    await markCountries(1)
    render(<Achievements />)

    expect(screen.getByText(/1 of 7 unlocked/)).toBeDefined()
    expect(namesIn('Unlocked')).toEqual(['First Step'])
  })

  it('a dieci Paesi sblocca anche Explorer e passa a Travel Addict', async () => {
    await markCountries(10)
    render(<Achievements />)

    expect(namesIn('Unlocked')).toEqual(['First Step', 'Explorer'])
    const next = screen.getByRole('region', { name: 'Next achievement' })
    expect(within(next).getByRole('heading', { level: 2 }).textContent).toBe('Travel Addict')
    expect(within(next).getByText('10 of 25 visited')).toBeDefined()
    expect(within(next).getByText(/15 to go/)).toBeDefined()
  })

  it('i bloccati mostrano quanto manca', async () => {
    await markCountries(10)
    render(<Achievements />)

    const locked = screen.getByRole('region', { name: 'Locked' })
    expect(within(locked).getByText('10/50')).toBeDefined()
    expect(within(locked).getByText('10/100')).toBeDefined()
    expect(within(locked).getByText('10/195')).toBeDefined()
  })

  /** La decisione presa: gli achievement guardano solo i 195 Stati ONU. */
  it('i territori non sbloccano niente', async () => {
    for (const code of ['GL', 'PR', 'RE', 'GU', 'AW', 'BM', 'KY', 'PF', 'NC', 'MQ']) {
      await useTravelStore.getState().markVisited(code)
    }
    render(<Achievements />)

    expect(screen.getByText(/0 of 7 unlocked/)).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Unlocked' })).toBeNull()
  })

  it('un viaggio vale quanto un marcatore manuale', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-01-01' })
    render(<Achievements />)

    expect(namesIn('Unlocked')).toEqual(['First Step'])
  })

  it('non persiste niente: gli achievement seguono lo stato', async () => {
    await markCountries(10)
    const { rerender } = render(<Achievements />)
    expect(namesIn('Unlocked')).toHaveLength(2)

    await useTravelStore.getState().resetData()
    rerender(<Achievements />)

    expect(screen.getByText(/0 of 7 unlocked/)).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Unlocked' })).toBeNull()
  })
})
