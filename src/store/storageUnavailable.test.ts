import { beforeEach, describe, expect, it } from 'vitest'
import { useTravelStore } from './travelStore'
import { isVisited } from './selectors'

/**
 * Scenario "Safari in navigazione privata": IndexedDB non esiste.
 *
 * Questo file NON importa `fake-indexeddb`: in ambiente Node il global
 * `indexedDB` è assente, quindi la condizione è reale, non simulata.
 * Vitest isola i moduli per file, perciò l'assenza non contagia gli altri test.
 */

beforeEach(() => {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
  })
})

describe('IndexedDB non disponibile', () => {
  it('non lancia: idrata a vuoto e avvisa l’utente', async () => {
    await expect(useTravelStore.getState().hydrate()).resolves.toBeUndefined()

    const state = useTravelStore.getState()
    expect(state.status).toBe('ready')
    expect(state.storage).toBe('unavailable')
    expect(state.storageMessage).toBeTruthy()
    // Messaggio per un essere umano, non uno stack trace.
    expect(state.storageMessage).not.toContain('Error')
  })

  it('l’app resta usabile: le modifiche vivono in memoria', async () => {
    await useTravelStore.getState().hydrate()
    await useTravelStore.getState().markVisited('IT')

    const { manuallyMarked, visits } = useTravelStore.getState()
    expect(manuallyMarked).toEqual(['IT'])
    expect(isVisited({ manuallyMarked, visits }, 'IT')).toBe(true)
    // L'avviso resta visibile: l'utente sa che non verrà salvato nulla.
    expect(useTravelStore.getState().storageMessage).toBeTruthy()
  })

  it('export e reset non lanciano nemmeno senza database', async () => {
    await useTravelStore.getState().hydrate()
    await useTravelStore.getState().markVisited('FR')

    expect(useTravelStore.getState().exportData().manuallyMarked).toEqual(['FR'])
    await expect(useTravelStore.getState().resetData()).resolves.toBeUndefined()
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
  })
})
