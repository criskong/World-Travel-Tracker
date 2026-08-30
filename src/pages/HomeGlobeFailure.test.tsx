// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'

/** RecentTrips contiene un <Link>: senza router non si monta. */
function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

/**
 * Cosa resta in piedi quando il globo non si puo disegnare.
 *
 * WebGL puo mancare davvero: driver vecchi, accelerazione disattivata,
 * troppi contesti gia aperti nella stessa scheda. La domanda che conta non e
 * se il globo fallisce, ma se l'app resta usabile quando succede.
 */

vi.mock('../components/Globe/GlobeView', () => ({
  default: function BrokenGlobe(): never {
    throw new Error('WebGL context could not be created')
  },
}))

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})

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
  vi.restoreAllMocks()
  await closeDatabase()
})

describe('quando il globo fallisce', () => {
  it('spiega cosa e successo, senza termini tecnici ne stack trace', async () => {
    renderHome()

    expect(await screen.findByText(/The globe could not be displayed/i)).toBeDefined()
    expect(screen.getByText(/Everything else still works/i)).toBeDefined()

    expect(document.body.textContent).not.toContain('WebGL context could not be created')
    expect(document.body.textContent).not.toContain('at ')
  })

  it('il resto della Home resta al suo posto', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    renderHome()

    await screen.findByText(/The globe could not be displayed/i)

    // Intestazione, statistiche e viaggi recenti: tutto ancora leggibile.
    expect(screen.getByRole('heading', { name: 'World Travel Tracker', level: 1 })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Statistics' })).toBeDefined()
    expect(screen.getByText('/ 195')).toBeDefined()
  })

  it('offre di riprovare', async () => {
    renderHome()
    await screen.findByText(/The globe could not be displayed/i)

    const retry = screen.getByRole('button', { name: /Try again/i })
    fireEvent.click(retry)

    // Il globo e rotto anche al secondo giro: si torna al messaggio, non a
    // una pagina bianca.
    expect(await screen.findByText(/The globe could not be displayed/i)).toBeDefined()
  })
})
