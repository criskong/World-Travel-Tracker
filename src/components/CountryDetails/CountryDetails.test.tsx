// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CountryDetails } from './CountryDetails'
import { useTravelStore } from '../../store/travelStore'
import { closeDatabase } from '../../services/storage/db'

/**
 * Il gesto di rimozione dello stato "visitato" (CLAUDE.md, "Decisioni prese").
 * È l'unica azione distruttiva dell'app e non ha annulla: la conferma deve
 * comparire quando serve, dire quanti viaggi elimina ed elencarli.
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

function renderDetails(code = 'JP') {
  const onClose = vi.fn()
  render(<CountryDetails code={code} onClose={onClose} />)
  return { onClose }
}

describe('CountryDetails', () => {
  it('mostra nome, continente, codice e stato', () => {
    renderDetails('JP')

    expect(screen.getByRole('heading', { name: 'Japan' })).toBeDefined()
    expect(screen.getByText('Asia')).toBeDefined()
    expect(screen.getByText('JP')).toBeDefined()
    expect(screen.getByText('Not visited')).toBeDefined()
  })

  it('marca il badge "Territory" solo fuori dai 195', () => {
    renderDetails('PR')
    expect(screen.getByText('Territory')).toBeDefined()

    cleanup()
    renderDetails('JP')
    expect(screen.queryByText('Territory')).toBeNull()
  })

  it('segna come visitato', async () => {
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as visited/ }))

    await waitFor(() => expect(screen.getByText('Visited')).toBeDefined())
    expect(useTravelStore.getState().manuallyMarked).toEqual(['JP'])
  })

  it('senza viaggi rimuove subito, senza chiedere conferma', async () => {
    await useTravelStore.getState().markVisited('JP')
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as not visited/ }))

    await waitFor(() => expect(useTravelStore.getState().manuallyMarked).toEqual([]))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('con viaggi chiede conferma, dice quanti sono e li elenca', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01', city: 'Osaka' })
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2019-04-01', city: 'Tokyo' })
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as not visited/ }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('delete the 2 trips')
    // I viaggi in ballo sono elencati, dal più recente.
    expect(dialog.textContent).toContain('Osaka')
    expect(dialog.textContent).toContain('Tokyo')
    expect(dialog.textContent?.indexOf('Osaka')).toBeLessThan(dialog.textContent!.indexOf('Tokyo'))
    // Finché non si conferma, non è stato cancellato nulla.
    expect(useTravelStore.getState().visits).toHaveLength(2)
  })

  it('annullare la conferma non tocca nulla', async () => {
    await useTravelStore.getState().markVisited('JP')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as not visited/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(useTravelStore.getState().visits).toHaveLength(1)
    expect(useTravelStore.getState().manuallyMarked).toEqual(['JP'])
  })

  it('confermare elimina marcatore e viaggi', async () => {
    await useTravelStore.getState().markVisited('JP')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    await useTravelStore.getState().addVisit({ countryCode: 'IT', date: '2024-06-01' })
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as not visited/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Remove and delete 1 trip/ }))

    await waitFor(() => expect(screen.getByText('Not visited')).toBeDefined())
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
    // Il viaggio in Italia non c'entra e resta.
    expect(useTravelStore.getState().visits.map((visit) => visit.countryCode)).toEqual(['IT'])
  })

  it('il singolare è al singolare', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Mark as not visited/ }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('delete the 1 trip recorded')
  })

  it('elenca i viaggi del Paese dal più recente', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2019-04-01', city: 'Tokyo' })
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-11-02', city: 'Osaka' })
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2022-08-15', city: 'Kyoto' })
    renderDetails('JP')

    expect(screen.getByText(/Trips \(3\)/)).toBeDefined()
    const cities = screen.getAllByText(/Tokyo|Osaka|Kyoto/).map((node) => node.textContent)
    expect(cities).toEqual(['Osaka', 'Kyoto', 'Tokyo'])
  })

  it('apre e chiude il form di aggiunta viaggio', async () => {
    renderDetails('JP')

    fireEvent.click(screen.getByRole('button', { name: /Add visit/ }))
    expect(screen.getByLabelText(/Date/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByLabelText(/Date/)).toBeNull())
  })
})
