// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'

/**
 * Dimostra il requisito di fase 3: il globo NON si rimonta quando cambiano
 * le statistiche.
 *
 * `GlobeView` è sostituito da un doppio leggerissimo che conta i propri
 * montaggi e smontaggi. Non serve WebGL: quello che si sta verificando è la
 * composizione di Home, cioè l'unica cosa che può davvero rompersi.
 */

const tracker = vi.hoisted(() => ({ mounts: 0, unmounts: 0, renders: 0 }))

vi.mock('../components/Globe/GlobeView', () => ({
  default: function GlobeDouble() {
    tracker.renders += 1
    useEffect(() => {
      tracker.mounts += 1
      return () => {
        tracker.unmounts += 1
      }
    }, [])
    return <div data-testid="globe" />
  },
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  tracker.mounts = 0
  tracker.unmounts = 0
  tracker.renders = 0

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

// Senza `globals: true` Testing Library non registra la pulizia da sé:
// va chiamata a mano, o i render si accumulano nello stesso document.
afterEach(async () => {
  cleanup()
  await closeDatabase()
})

describe('Home', () => {
  it('mostra header, globo ed empty state al primo avvio', async () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'World Travel Tracker' })).toBeDefined()
    await screen.findByTestId('globe')
    expect(screen.getByText(/Your world is still waiting/)).toBeDefined()
    expect(screen.getByText(/0 \/ 195 countries/)).toBeDefined()
    expect(screen.getByText(/No trips recorded yet/)).toBeDefined()
  })

  it('il globo non si rimonta quando cambiano le statistiche', async () => {
    renderHome()
    await screen.findByTestId('globe')

    expect(tracker.mounts).toBe(1)
    expect(tracker.unmounts).toBe(0)

    // Primo Paese: l'empty state lascia il posto ai numeri. È il cambio di
    // struttura più violento che la Home possa subire.
    await act(async () => {
      await useTravelStore.getState().markVisited('IT')
    })
    await waitFor(() => {
      expect(screen.getByText('1')).toBeDefined()
    })
    expect(screen.getByText('/ 195')).toBeDefined()
    expect(screen.queryByText(/Your world is still waiting/)).toBeNull()

    // Altri aggiornamenti: percentuali, barre per continente, viaggi recenti.
    await act(async () => {
      await useTravelStore.getState().markVisited('JP')
      await useTravelStore.getState().markVisited('BR')
      await useTravelStore.getState().addVisit({ countryCode: 'FR', date: '2024-07-14' })
    })
    await waitFor(() => {
      expect(screen.getByText('4')).toBeDefined()
    })
    expect(screen.getByText(/14 Jul 2024/)).toBeDefined()

    // Il globo è ancora quello di prima: montato una volta, mai smontato.
    expect(tracker.mounts).toBe(1)
    expect(tracker.unmounts).toBe(0)
  })

  it('il globo non ri-renderizza nemmeno, grazie a memo', async () => {
    renderHome()
    await screen.findByTestId('globe')
    const rendersAfterMount = tracker.renders

    await act(async () => {
      await useTravelStore.getState().markVisited('IT')
      await useTravelStore.getState().markVisited('JP')
    })
    await waitFor(() => {
      expect(screen.getByText('2')).toBeDefined()
    })

    // Le props del globo (onSelectCountry, selectedIso) non sono cambiate.
    expect(tracker.renders).toBe(rendersAfterMount)
  })

  it('smonta il globo una sola volta quando la Home viene rimossa', async () => {
    const { unmount } = renderHome()
    await screen.findByTestId('globe')

    unmount()

    expect(tracker.mounts).toBe(1)
    expect(tracker.unmounts).toBe(1)
  })
})
