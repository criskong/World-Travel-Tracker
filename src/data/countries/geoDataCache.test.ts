import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GEOJSON_FILENAME } from './dataset'
import { clearCachedDatasets, readCachedDataset, writeCachedDataset } from '../../services/storage'
import { closeDatabase } from '../../services/storage/db'
import type { CountryPolygon } from './geoData'

/**
 * La copia locale del dataset, provata dal punto di vista dell'app.
 *
 * `geoData` memoizza il caricamento per tutta la sessione, quindi per
 * simulare "l'utente riapre la pagina" bisogna azzerare il registro dei
 * moduli: `vi.resetModules()` fa esattamente questo, e la seconda importazione
 * riparte da zero come dopo un refresh. Il database invece resta, come resta
 * IndexedDB fra un refresh e l'altro.
 */

const DATASET = readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8')

let fetchCount = 0

beforeEach(async () => {
  fetchCount = 0
  vi.resetModules()

  // `whenIdle` preferisce requestIdleCallback: fornendolo, la scrittura in
  // cache avviene subito e il test non deve aspettare il timer di riserva.
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    callback()
    return 0
  })

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      fetchCount += 1
      return {
        ok: true,
        status: 200,
        text: async () => DATASET,
        json: async () => JSON.parse(DATASET) as unknown,
      } as unknown as Response
    }),
  )

  await clearCachedDatasets()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await clearCachedDatasets()
  await closeDatabase()
})

/** Un avvio dell'app: registro dei moduli pulito, database intatto. */
async function openApp(): Promise<{
  polygons: CountryPolygon[]
  source: 'cache' | 'network' | null
}> {
  vi.resetModules()
  const module = await import('./geoData')
  const polygons = await module.loadCountryPolygons()
  return { polygons, source: module.datasetSource() }
}

/** La scrittura in cache è programmata, non attesa: qui le si dà un giro. */
async function settle(): Promise<void> {
  await new Promise((done) => setTimeout(done, 0))
}

describe('la prima volta', () => {
  it('scarica il dataset e lo mette da parte', async () => {
    const first = await openApp()

    expect(fetchCount).toBe(1)
    expect(first.source).toBe('network')
    expect(first.polygons).toHaveLength(242)

    await settle()
    expect(await readCachedDataset(GEOJSON_FILENAME)).toBe(DATASET)
  })
})

describe('le volte dopo', () => {
  it('non tocca la rete: il pianeta non si riscarica a ogni apertura', async () => {
    await openApp()
    await settle()
    expect(fetchCount).toBe(1)

    const second = await openApp()

    expect(fetchCount).toBe(1)
    expect(second.source).toBe('cache')
  })

  it('i Paesi sono esattamente gli stessi', async () => {
    const first = await openApp()
    await settle()
    const second = await openApp()

    expect(second.polygons).toHaveLength(first.polygons.length)
    expect(second.polygons.map((polygon) => polygon.iso)).toEqual(
      first.polygons.map((polygon) => polygon.iso),
    )
    expect(second.polygons.filter((polygon) => polygon.iso === null)).toHaveLength(3)
  })

  it('la geometria e gia ridotta come quella scaricata', async () => {
    const first = await openApp()
    await settle()
    const second = await openApp()

    const vertices = (polygons: CountryPolygon[]) =>
      JSON.stringify(polygons.map((polygon) => polygon.feature.geometry)).length

    expect(vertices(second.polygons)).toBe(vertices(first.polygons))
  })

  it('riapre senza rete: il globo funziona offline', async () => {
    await openApp()
    await settle()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    const offline = await openApp()
    expect(offline.source).toBe('cache')
    expect(offline.polygons).toHaveLength(242)
  })
})

describe('quando la copia locale e rovinata', () => {
  it('la butta e riscarica, invece di restare rotta per sempre', async () => {
    await writeCachedDataset(GEOJSON_FILENAME, '{"features": [')

    const recovered = await openApp()

    expect(recovered.source).toBe('network')
    expect(recovered.polygons).toHaveLength(242)
    expect(fetchCount).toBe(1)
  })

  it('rimette in cache la copia buona', async () => {
    await writeCachedDataset(GEOJSON_FILENAME, 'non e nemmeno JSON')
    await openApp()
    await settle()

    expect(await readCachedDataset(GEOJSON_FILENAME)).toBe(DATASET)
  })

  it('un JSON valido ma senza feature vale come rovinato', async () => {
    await writeCachedDataset(GEOJSON_FILENAME, '{"type":"FeatureCollection","features":[]}')

    const recovered = await openApp()
    expect(recovered.source).toBe('network')
    expect(recovered.polygons).toHaveLength(242)
  })
})

describe('quando lo storage non e utilizzabile', () => {
  it('scarica ogni volta, senza mai lanciare', async () => {
    await closeDatabase()
    vi.stubGlobal('indexedDB', undefined)

    const first = await openApp()
    expect(first.source).toBe('network')
    expect(first.polygons).toHaveLength(242)

    const second = await openApp()
    expect(second.source).toBe('network')
    expect(fetchCount).toBe(2)
  })
})
