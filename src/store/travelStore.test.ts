import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTravelStore } from './travelStore'
import { isVisited } from './selectors'
import { closeDatabase } from '../services/storage/db'
import type { TravelData } from '../types'

/**
 * Test delle azioni dello store contro un IndexedDB reale (fake-indexeddb).
 * Non sono mock: ogni assert passa davvero da Dexie.
 */

function data(): TravelData {
  const { manuallyMarked, visits } = useTravelStore.getState()
  return { manuallyMarked, visits }
}

/** Riporta lo store allo stato di un'app appena avviata, senza toccare il DB. */
function resetStoreMemory(): void {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
  })
}

/**
 * Simula un refresh della pagina: la memoria si azzera e la connessione al
 * database viene chiusa, esattamente come quando il tab viene ricaricato.
 * I dati su IndexedDB restano dove sono.
 */
async function simulateReload(): Promise<void> {
  resetStoreMemory()
  await closeDatabase()
  await useTravelStore.getState().hydrate()
}

beforeEach(async () => {
  resetStoreMemory()
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  await closeDatabase()
})

describe('hydrate', () => {
  it('parte da zero Paesi visitati e segnala lo storage disponibile', () => {
    const state = useTravelStore.getState()
    expect(state.status).toBe('ready')
    expect(state.storage).toBe('available')
    expect(state.storageMessage).toBeNull()
    expect(state.manuallyMarked).toEqual([])
    expect(state.visits).toEqual([])
  })

  it('passa da idle a ready', async () => {
    resetStoreMemory()
    expect(useTravelStore.getState().status).toBe('idle')
    const pending = useTravelStore.getState().hydrate()
    expect(useTravelStore.getState().status).toBe('hydrating')
    await pending
    expect(useTravelStore.getState().status).toBe('ready')
  })

  it('è idempotente: una seconda chiamata non ricarica', async () => {
    await useTravelStore.getState().markVisited('IT')
    useTravelStore.setState({ manuallyMarked: [] })
    await useTravelStore.getState().hydrate()
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
  })
})

describe('markVisited / unmarkVisited', () => {
  it('marca un Paese e lo rende visitato', async () => {
    await useTravelStore.getState().markVisited('IT')
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT'])
    expect(isVisited(data(), 'IT')).toBe(true)
  })

  it('normalizza il codice in maiuscolo', async () => {
    await useTravelStore.getState().markVisited('jp')
    expect(useTravelStore.getState().manuallyMarked).toEqual(['JP'])
  })

  it('è idempotente: nessun duplicato', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().markVisited('IT')
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT'])
  })

  it('rifiuta un codice non presente nella fonte di verità', async () => {
    await useTravelStore.getState().markVisited('ZZ')
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
    expect(useTravelStore.getState().lastError).toContain('ZZ')
  })

  it('toglie il marcatore', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().unmarkVisited('IT')
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
    expect(isVisited(data(), 'IT')).toBe(false)
  })

  it('toggleVisited alterna marcato e non marcato', async () => {
    await useTravelStore.getState().toggleVisited('FR')
    expect(isVisited(data(), 'FR')).toBe(true)
    await useTravelStore.getState().toggleVisited('FR')
    expect(isVisited(data(), 'FR')).toBe(false)
  })

  it('un Paese con viaggi resta visitato anche senza marcatore manuale', async () => {
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    await useTravelStore.getState().markVisited('JP')
    await useTravelStore.getState().unmarkVisited('JP')

    expect(useTravelStore.getState().manuallyMarked).toEqual([])
    expect(isVisited(data(), 'JP')).toBe(true)
  })
})

describe('addVisit / removeVisit', () => {
  it('genera un id e rende visitato il Paese', async () => {
    const visit = await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    expect(visit?.id).toBeTruthy()
    expect(isVisited(data(), 'JP')).toBe(true)
  })

  it('rifiuta una data non valida', async () => {
    const visit = await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-02-31' })
    expect(visit).toBeNull()
    expect(useTravelStore.getState().visits).toEqual([])
    expect(useTravelStore.getState().lastError).toContain('Data')
  })

  it('rifiuta un Paese sconosciuto', async () => {
    const visit = await useTravelStore.getState().addVisit({ countryCode: 'ZZ', date: '2024-05-01' })
    expect(visit).toBeNull()
    expect(useTravelStore.getState().visits).toEqual([])
  })

  it('rimuove un viaggio', async () => {
    const visit = await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    await useTravelStore.getState().removeVisit(visit!.id)
    expect(useTravelStore.getState().visits).toEqual([])
    expect(isVisited(data(), 'JP')).toBe(false)
  })
})

describe('exportData / importData', () => {
  it('esporta lo stato corrente con i metadati di formato', async () => {
    await useTravelStore.getState().markVisited('IT')
    const exported = useTravelStore.getState().exportData()

    expect(exported.formatVersion).toBe(1)
    expect(exported.manuallyMarked).toEqual(['IT'])
    expect(exported.visits).toEqual([])
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false)
  })

  it('reimporta un export precedente identico', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })
    const exported = useTravelStore.getState().exportData()

    await useTravelStore.getState().resetData()
    expect(useTravelStore.getState().manuallyMarked).toEqual([])

    const outcome = await useTravelStore.getState().importData(exported)
    expect(outcome.ok).toBe(true)
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT'])
    expect(isVisited(data(), 'JP')).toBe(true)
  })

  it("l'import sostituisce i dati precedenti, non li fonde", async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().importData({ manuallyMarked: ['FR'], visits: [] })
    expect(useTravelStore.getState().manuallyMarked).toEqual(['FR'])
  })

  it('rifiuta un file non valido lasciando lo stato intatto', async () => {
    await useTravelStore.getState().markVisited('IT')
    const outcome = await useTravelStore.getState().importData({ visits: [] })

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.length).toBeGreaterThan(0)
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT'])
  })

  it('segnala le voci scartate senza bloccare l’import', async () => {
    const outcome = await useTravelStore
      .getState()
      .importData({ manuallyMarked: ['IT', 'ZZ'], visits: [] })

    expect(outcome.ok).toBe(true)
    expect(outcome.warnings.length).toBe(1)
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT'])
  })
})

describe('resetData', () => {
  it('svuota memoria e database', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-05-01' })

    await useTravelStore.getState().resetData()
    expect(data()).toEqual({ manuallyMarked: [], visits: [] })

    await simulateReload()
    expect(data()).toEqual({ manuallyMarked: [], visits: [] })
  })
})

describe('persistenza attraverso un reload', () => {
  it('i Paesi marcati sopravvivono alla chiusura del database', async () => {
    await useTravelStore.getState().toggleVisited('IT')
    await useTravelStore.getState().toggleVisited('JP')

    await simulateReload()

    expect(useTravelStore.getState().status).toBe('ready')
    expect(useTravelStore.getState().storage).toBe('available')
    expect(useTravelStore.getState().manuallyMarked).toEqual(['IT', 'JP'])
    expect(isVisited(data(), 'IT')).toBe(true)
    expect(isVisited(data(), 'JP')).toBe(true)
  })

  it('i viaggi sopravvivono con tutti i loro campi', async () => {
    await useTravelStore.getState().addVisit({
      countryCode: 'FR',
      date: '2024-07-14',
      city: 'Paris',
      note: 'Bastille',
    })

    await simulateReload()

    expect(useTravelStore.getState().visits).toEqual([
      expect.objectContaining({ countryCode: 'FR', date: '2024-07-14', city: 'Paris', note: 'Bastille' }),
    ])
  })

  it('un Paese smarcato resta smarcato dopo il reload', async () => {
    await useTravelStore.getState().toggleVisited('IT')
    await useTravelStore.getState().toggleVisited('IT')

    await simulateReload()

    expect(useTravelStore.getState().manuallyMarked).toEqual([])
    expect(isVisited(data(), 'IT')).toBe(false)
  })
})
