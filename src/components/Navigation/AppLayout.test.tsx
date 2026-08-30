// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { useTravelStore } from '../../store/travelStore'
import { closeDatabase } from '../../services/storage/db'

/**
 * Il globo non deve ricostruirsi quando si cambia pagina.
 *
 * Ricostruirlo vuol dire 610 mesh e un contesto WebGL nuovi ogni volta che si
 * torna sulla home: ~300 ms su desktop, molti di più su telefono. Per questo
 * Home è montata stabilmente in `AppLayout` e viene solo nascosta.
 *
 * Il doppio di `GlobeView` conta i montaggi: è l'unico modo di misurarlo
 * senza WebGL, che in jsdom non esiste.
 */

const globe = vi.hoisted(() => ({ mounts: 0, unmounts: 0 }))

vi.mock('../Globe/GlobeView', () => ({
  default: function GlobeDouble() {
    useEffect(() => {
      globe.mounts += 1
      return () => {
        globe.unmounts += 1
      }
    }, [])
    return <div data-testid="globe-double" />
  },
}))

beforeEach(async () => {
  globe.mounts = 0
  globe.unmounts = 0

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

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

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

/** Naviga usando i link veri della sidebar / bottom nav. */
function goTo(name: RegExp): void {
  const links = screen.getAllByRole('link', { name })
  fireEvent.click(links[0]!)
}

async function globeMounted(): Promise<void> {
  await waitFor(() => expect(globe.mounts).toBeGreaterThan(0))
}

describe('il globo attraversa la navigazione', () => {
  it('si monta una volta sola andando e tornando dalla home', async () => {
    renderApp()
    await globeMounted()
    expect(globe.mounts).toBe(1)

    goTo(/Statistics/i)
    await screen.findByRole('heading', { name: 'Statistics', level: 1 })

    goTo(/Home/i)
    await screen.findByRole('heading', { name: 'World Travel Tracker', level: 1 })

    expect(globe.mounts).toBe(1)
    expect(globe.unmounts).toBe(0)
  })

  it('resiste a un giro completo di tutte le pagine', async () => {
    renderApp()
    await globeMounted()

    for (const page of [/Countries/i, /Trips/i, /Statistics/i, /Achievements/i, /Settings/i]) {
      goTo(page)
      await waitFor(() => expect(screen.queryByTestId('globe-double')).not.toBeNull())
    }

    expect(globe.mounts).toBe(1)
    expect(globe.unmounts).toBe(0)
  })

  it('la home resta nel DOM ma nascosta quando si e altrove', async () => {
    renderApp()
    await globeMounted()

    goTo(/Settings/i)
    await screen.findByRole('heading', { name: 'Settings', level: 1 })

    const globeDouble = screen.getByTestId('globe-double')
    // Ancora montato...
    expect(globeDouble).toBeDefined()
    // ...ma dentro un contenitore nascosto: `hidden` porta display:none, che
    // e anche il segnale con cui GlobeView mette in pausa il rendering.
    expect(globeDouble.closest('[hidden]')).not.toBeNull()
  })

  it('sulla home il contenitore non e nascosto', async () => {
    renderApp()
    await globeMounted()

    expect(screen.getByTestId('globe-double').closest('[hidden]')).toBeNull()
  })

  it('entrando da un link diretto a una pagina interna, il globo si monta lo stesso', async () => {
    renderApp('/statistics')
    await screen.findByRole('heading', { name: 'Statistics', level: 1 })

    // Home e montata comunque: e il prezzo di tenerla viva, ed e voluto.
    await globeMounted()
    expect(globe.mounts).toBe(1)
  })

  it('una pagina inesistente mostra il 404 senza toccare il globo', async () => {
    renderApp('/non-esiste')
    await globeMounted()
    expect(await screen.findByText(/404/)).toBeDefined()
    expect(globe.unmounts).toBe(0)
  })
})
