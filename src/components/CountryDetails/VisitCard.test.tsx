// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CountryDetails } from './CountryDetails'
import { useTravelStore } from '../../store/travelStore'
import { closeDatabase } from '../../services/storage/db'

/**
 * Modifica di un viaggio dalla card e apertura delle foto a tutto schermo.
 *
 * jsdom non sa fare `URL.createObjectURL`: si finge, e il Blob letto da
 * fake-indexeddb in jsdom arriva degradato — qui contano i comportamenti
 * dell'interfaccia, i byte li verifica `updateVisit.test.ts`.
 */

beforeEach(async () => {
  URL.createObjectURL = vi.fn(() => `blob:test/${Math.random()}`)
  URL.revokeObjectURL = vi.fn()
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

async function seedTrip(photos = 0) {
  const blobs = Array.from(
    { length: photos },
    (_, i) => new Blob([new Uint8Array([0xff, 0xd8, i])], { type: 'image/jpeg' }),
  )
  return (await useTravelStore
    .getState()
    .addVisit({ countryCode: 'JP', date: '2024-05-01', city: 'Kyoto', note: 'Ramen' }, blobs.length ? blobs : undefined))!
}

describe('modifica di un viaggio', () => {
  it('la matita apre il form gia compilato con i dati del viaggio', async () => {
    await seedTrip()
    render(<CountryDetails code="JP" onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit this trip' }))

    expect(screen.getByLabelText('City (optional)')).toHaveProperty('value', 'Kyoto')
    expect(screen.getByLabelText('Note (optional)')).toHaveProperty('value', 'Ramen')
    expect(screen.getByLabelText(/^Date/)).toHaveProperty('value', '2024-05-01')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDefined()
  })

  it('salvare aggiorna il viaggio invece di crearne un altro', async () => {
    const visit = await seedTrip()
    render(<CountryDetails code="JP" onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit this trip' }))
    fireEvent.change(screen.getByLabelText('City (optional)'), { target: { value: 'Osaka' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByText('Osaka')).toBeDefined())
    const { visits } = useTravelStore.getState()
    expect(visits).toHaveLength(1)
    expect(visits[0]).toMatchObject({ id: visit.id, city: 'Osaka', note: 'Ramen' })
  })

  it('annullare non cambia niente', async () => {
    await seedTrip()
    render(<CountryDetails code="JP" onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit this trip' }))
    fireEvent.change(screen.getByLabelText('City (optional)'), { target: { value: 'Osaka' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Kyoto')).toBeDefined()
    expect(useTravelStore.getState().visits[0]?.city).toBe('Kyoto')
  })

  it('in modifica le foto esistenti si vedono e si possono togliere', async () => {
    const visit = await seedTrip(2)
    render(<CountryDetails code="JP" onClose={vi.fn()} />)

    // Le foto della card arrivano da IndexedDB: si aspettano.
    await screen.findByRole('button', { name: 'Open photo 2' })
    fireEvent.click(screen.getByRole('button', { name: 'Edit this trip' }))

    const removers = await screen.findAllByRole('button', { name: /^Remove photo/ })
    expect(removers).toHaveLength(2)
    fireEvent.click(removers[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(useTravelStore.getState().visits[0]?.photoIds).toHaveLength(1))
    expect(useTravelStore.getState().visits[0]?.photoIds).toEqual([visit.photoIds![1]])
  })
})

describe('foto a tutto schermo', () => {
  it('cliccando una foto si apre, e Esc la chiude SENZA chiudere i dettagli', async () => {
    await seedTrip(2)
    const onClose = vi.fn()
    render(<CountryDetails code="JP" onClose={onClose} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: 'Photo from this trip' })
    expect(within(dialog).getByText('1 of 2')).toBeDefined()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(within(dialog).getByText('2 of 2')).toBeDefined()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Photo from this trip' })).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('con una foto sola non ci sono frecce ne contatore', async () => {
    await seedTrip(1)
    render(<CountryDetails code="JP" onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: 'Photo from this trip' })

    expect(within(dialog).queryByRole('button', { name: 'Next photo' })).toBeNull()
    expect(within(dialog).queryByText(/ of /)).toBeNull()
  })
})
