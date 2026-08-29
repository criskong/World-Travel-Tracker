// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Countries from './Countries'
import { COUNTRIES } from '../data/countries/countries'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'

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

function renderPage() {
  return render(
    <MemoryRouter>
      <Countries />
    </MemoryRouter>,
  )
}

/**
 * Le righe della lista, escluse quelle del drawer dei dettagli.
 *
 * Query DOM e non `getAllByRole`: le righe sono 250 e questa funzione gira
 * dentro `waitFor`, che la richiama ogni 50 ms. Con una query per ruolo per
 * ogni riga il solo costo delle query portava il test al timeout. Le righe
 * sono `<li>` e `<button>` veri, quindi il ruolo implicito è lo stesso.
 */
function rowNames(): string[] {
  return [...document.querySelectorAll('li')]
    .map((item) => item.querySelector('button')?.textContent ?? '')
    .filter((text) => text.length > 0)
}

describe('Countries', () => {
  it('elenca tutti i Paesi in ordine alfabetico', () => {
    renderPage()

    const names = rowNames()
    expect(names).toHaveLength(COUNTRIES.length)
    expect(names[0]).toContain('Afghanistan')
    expect(names.at(-1)).toContain('Zimbabwe')
  })

  it('cerca per nome e per codice', async () => {
    renderPage()
    const search = screen.getByRole('searchbox', { name: /Search countries/ })

    fireEvent.change(search, { target: { value: 'japan' } })
    await waitFor(() => expect(rowNames()).toHaveLength(1))
    expect(rowNames()[0]).toContain('Japan')

    fireEvent.change(search, { target: { value: 'BR' } })
    await waitFor(() => expect(rowNames().some((name) => name.includes('Brazil'))).toBe(true))
  })

  it('filtra per stato di visita', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().markVisited('JP')
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: /Visited/ }))
    await waitFor(() => expect(rowNames()).toHaveLength(2))

    fireEvent.click(screen.getByRole('tab', { name: /Not visited/ }))
    await waitFor(() => expect(rowNames()).toHaveLength(COUNTRIES.length - 2))
  })

  it('filtra per continente e si combina con la ricerca', async () => {
    renderPage()

    // Scoped al gruppo dei filtri: `getByRole('button')` sull'intera pagina
    // calcolerebbe il nome accessibile di tutti i 250 bottoni delle righe.
    const continents = screen.getByRole('group', { name: 'Filter by continent' })
    fireEvent.click(within(continents).getByRole('button', { name: 'Oceania' }))
    await waitFor(() => {
      expect(rowNames().some((name) => name.includes('Fiji'))).toBe(true)
      expect(rowNames().some((name) => name.includes('Italy'))).toBe(false)
    })

    fireEvent.change(screen.getByRole('searchbox', { name: /Search countries/ }), {
      target: { value: 'fi' },
    })
    await waitFor(() => expect(rowNames().every((name) => !name.includes('Finland'))).toBe(true))
  })

  it('mostra un empty state quando nulla combacia', async () => {
    renderPage()

    fireEvent.change(screen.getByRole('searchbox', { name: /Search countries/ }), {
      target: { value: 'zzzzz' },
    })

    expect(await screen.findByText(/No countries match these filters/)).toBeDefined()
  })

  it('segna i Paesi visitati e conta i loro viaggi', async () => {
    await useTravelStore.getState().markVisited('JP')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-01-01' })
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-06-01' })
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: /Visited/ }))
    await waitFor(() => expect(rowNames()).toHaveLength(1))
    expect(rowNames()[0]).toContain('2 trips')
    expect(rowNames()[0]).toContain('Visited')
  })

  it('aprendo una riga si aprono i dettagli di quel Paese', async () => {
    renderPage()

    fireEvent.change(screen.getByRole('searchbox', { name: /Search countries/ }), {
      target: { value: 'japan' },
    })
    await waitFor(() => expect(rowNames()).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: /Japan/ }))

    expect(await screen.findByRole('heading', { name: 'Japan' })).toBeDefined()
    expect(screen.getByRole('button', { name: /Mark as visited/ })).toBeDefined()
  })

  /**
   * Giustifica la scelta di NON virtualizzare la lista. Il numero stampato
   * qui è il costo reale del caso peggiore: 250 righe, tutte montate.
   * La soglia è larga apposta: serve a intercettare una regressione di ordine
   * di grandezza, non a misurare la macchina di chi lancia i test.
   */
  it('renderizza tutte le 250 righe in tempi trascurabili', () => {
    const started = performance.now()
    renderPage()
    const elapsed = performance.now() - started

    expect(rowNames()).toHaveLength(COUNTRIES.length)
    console.log(`[countries] ${COUNTRIES.length} righe montate in ${elapsed.toFixed(0)} ms`)
    expect(elapsed).toBeLessThan(2000)
  })
})
