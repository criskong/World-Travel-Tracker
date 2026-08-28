import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTravelStore } from './travelStore'
import { buildVisitedSet } from './selectors'
import { closeDatabase } from '../services/storage/db'
import { COLOR_UNVISITED, COLOR_VISITED, polygonCapColor } from '../components/Globe/globeColors'

/**
 * Verifica end-to-end del percorso "click -> IndexedDB -> refresh -> colore",
 * senza il canvas WebGL: si esercita la stessa catena di funzioni che il
 * componente Globe usa a ogni frame.
 *
 *   toggleVisited (azione dello store, quella collegata a onPolygonClick)
 *     -> Dexie -> IndexedDB
 *     -> reload: memoria azzerata + connessione chiusa
 *     -> hydrate()
 *     -> buildVisitedSet()  (identico a useVisitedCodes)
 *     -> polygonCapColor()  (identico a polygonCapColor del globo)
 */

function visitedSet(): ReadonlySet<string> {
  const { manuallyMarked, visits } = useTravelStore.getState()
  return buildVisitedSet({ manuallyMarked, visits })
}

/** Il colore che il globo assegnerebbe a quel Paese, senza puntatore sopra. */
function colorOnGlobe(iso: string): string {
  return polygonCapColor({ iso, visited: visitedSet(), hoveredIso: null })
}

/** Refresh della pagina: memoria azzerata, connessione chiusa, dati sul disco. */
async function refreshPage(): Promise<void> {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
  })
  await closeDatabase()
  await useTravelStore.getState().hydrate()
}

beforeEach(async () => {
  await refreshPage()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  await closeDatabase()
})

describe('dopo un refresh i Paesi cliccati restano colorati', () => {
  it('prima del click sono tutti grigi', () => {
    expect(colorOnGlobe('IT')).toBe(COLOR_UNVISITED)
    expect(colorOnGlobe('JP')).toBe(COLOR_UNVISITED)
  })

  it("dopo il click il Paese prende l'accent color e lo conserva dopo il refresh", async () => {
    await useTravelStore.getState().toggleVisited('IT')
    expect(colorOnGlobe('IT')).toBe(COLOR_VISITED)

    await refreshPage()

    expect(useTravelStore.getState().storage).toBe('available')
    expect(colorOnGlobe('IT')).toBe(COLOR_VISITED)
    expect(colorOnGlobe('JP')).toBe(COLOR_UNVISITED)
  })

  it('resiste a più refresh consecutivi', async () => {
    await useTravelStore.getState().toggleVisited('FR')
    await refreshPage()
    await refreshPage()
    await refreshPage()

    expect(colorOnGlobe('FR')).toBe(COLOR_VISITED)
  })

  it('un secondo click smarca il Paese e il grigio sopravvive al refresh', async () => {
    await useTravelStore.getState().toggleVisited('IT')
    await refreshPage()
    await useTravelStore.getState().toggleVisited('IT')
    expect(colorOnGlobe('IT')).toBe(COLOR_UNVISITED)

    await refreshPage()

    expect(colorOnGlobe('IT')).toBe(COLOR_UNVISITED)
  })

  it('anche un Paese visitato tramite viaggio resta colorato dopo il refresh', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })

    await refreshPage()

    expect(colorOnGlobe('JP')).toBe(COLOR_VISITED)
    // Il colore arriva dai viaggi, non da un marcatore manuale persistito.
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
  })

  it('molti Paesi insieme tornano tutti colorati', async () => {
    const codes = ['IT', 'FR', 'JP', 'BR', 'ZA', 'AU']
    for (const code of codes) {
      await useTravelStore.getState().toggleVisited(code)
    }

    await refreshPage()

    for (const code of codes) {
      expect(colorOnGlobe(code)).toBe(COLOR_VISITED)
    }
    expect(colorOnGlobe('US')).toBe(COLOR_UNVISITED)
  })
})
