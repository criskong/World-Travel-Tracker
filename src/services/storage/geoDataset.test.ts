import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cachedDatasetSize,
  clearCachedDatasets,
  pruneCachedDatasets,
  readCachedDataset,
  writeCachedDataset,
} from './geoDataset'
import { closeDatabase, openDatabase } from './db'

/**
 * La cache del dataset gira contro un IndexedDB vero (fake-indexeddb).
 * Il controllo che conta più di tutti è l'ultimo blocco: quando lo storage
 * non c'è, queste funzioni non devono lanciare. Se lanciassero, il globo non
 * comparirebbe più in navigazione privata — per colpa di un'ottimizzazione.
 */

beforeEach(async () => {
  await clearCachedDatasets()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await closeDatabase()
})

describe('lettura e scrittura', () => {
  it('senza copia locale non restituisce niente', async () => {
    expect(await readCachedDataset('countries-50m.geojson')).toBeNull()
  })

  it('rilegge quello che ha scritto, byte per byte', async () => {
    const body = '{"type":"FeatureCollection","features":[]}'
    expect(await writeCachedDataset('countries-50m.geojson', body)).toBe(true)
    expect(await readCachedDataset('countries-50m.geojson')).toBe(body)
  })

  it('sopravvive alla chiusura del database, come a un refresh', async () => {
    await writeCachedDataset('countries-50m.geojson', 'primo')
    await closeDatabase()
    expect(await readCachedDataset('countries-50m.geojson')).toBe('primo')
  })

  it('una chiave diversa e una cache diversa: cambiare dataset la invalida', async () => {
    await writeCachedDataset('countries-110m.geojson', 'vecchio')
    expect(await readCachedDataset('countries-50m.geojson')).toBeNull()
  })

  it('riscrivere la stessa chiave sostituisce, non accumula', async () => {
    await writeCachedDataset('d.geojson', 'primo')
    await writeCachedDataset('d.geojson', 'secondo')

    expect(await readCachedDataset('d.geojson')).toBe('secondo')
    const database = await openDatabase()
    expect(await database.datasets.count()).toBe(1)
  })

  it('registra la dimensione', async () => {
    await writeCachedDataset('d.geojson', 'x'.repeat(1234))
    expect(await cachedDatasetSize('d.geojson')).toBe(1234)
    expect(await cachedDatasetSize('altro.geojson')).toBe(0)
  })

  it('regge un testo delle dimensioni del dataset vero', async () => {
    const big = 'x'.repeat(3_000_000)
    expect(await writeCachedDataset('big.geojson', big)).toBe(true)
    expect((await readCachedDataset('big.geojson'))?.length).toBe(3_000_000)
  })
})

describe('pulizia dei dataset vecchi', () => {
  it('cancella le copie diverse da quella in uso', async () => {
    await writeCachedDataset('countries-110m.geojson', 'vecchio')
    await writeCachedDataset('countries-50m.geojson', 'nuovo')

    expect(await pruneCachedDatasets('countries-50m.geojson')).toBe(1)
    expect(await readCachedDataset('countries-110m.geojson')).toBeNull()
    expect(await readCachedDataset('countries-50m.geojson')).toBe('nuovo')
  })

  it('non cancella niente se c e solo quella giusta', async () => {
    await writeCachedDataset('countries-50m.geojson', 'nuovo')
    expect(await pruneCachedDatasets('countries-50m.geojson')).toBe(0)
    expect(await readCachedDataset('countries-50m.geojson')).toBe('nuovo')
  })

  it('su una cache vuota non fa niente', async () => {
    expect(await pruneCachedDatasets('countries-50m.geojson')).toBe(0)
  })
})

describe('quando lo storage non e utilizzabile', () => {
  /** Simula Safari in navigazione privata: IndexedDB non esiste. */
  function withoutIndexedDb(): void {
    vi.stubGlobal('indexedDB', undefined)
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('la lettura restituisce null invece di lanciare', async () => {
    await closeDatabase()
    withoutIndexedDb()
    await expect(readCachedDataset('countries-50m.geojson')).resolves.toBeNull()
  })

  it('la scrittura fallisce in silenzio', async () => {
    await closeDatabase()
    withoutIndexedDb()
    await expect(writeCachedDataset('countries-50m.geojson', 'x')).resolves.toBe(false)
  })

  it('la pulizia non lancia', async () => {
    await closeDatabase()
    withoutIndexedDb()
    await expect(pruneCachedDatasets('countries-50m.geojson')).resolves.toBe(0)
  })

  it('la dimensione e zero', async () => {
    await closeDatabase()
    withoutIndexedDb()
    await expect(cachedDatasetSize('countries-50m.geojson')).resolves.toBe(0)
  })

  it('anche svuotare non lancia', async () => {
    await closeDatabase()
    withoutIndexedDb()
    await expect(clearCachedDatasets()).resolves.toBeUndefined()
  })
})
