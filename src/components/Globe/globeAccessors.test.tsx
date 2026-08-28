// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import accessorFn from 'accessor-fn'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTravelStore } from '../../store/travelStore'
import { closeDatabase } from '../../services/storage/db'
import type { CountryPolygon } from '../../data/countries/geoData'

/**
 * CONTRATTO CON react-globe.gl.
 *
 * Tutti gli altri test sul globo usano un doppio della libreria, quindi da
 * soli non verificano nulla di ciò che la libreria si aspetta da noi. Questo
 * file copre quel buco: monta il GlobeView reale, intercetta le props passate
 * a `<Globe>` e verifica che OGNI accessor, applicato a OGNI poligono del
 * dataset, restituisca un valore del tipo giusto senza lanciare.
 *
 * Gli accessor vengono risolti con lo stesso `accessor-fn` che usa
 * three-globe, non con una sua imitazione. È importante: `accessorFn` tratta
 * una STRINGA come nome di proprietà, quindi passare `polygonSideColor="red"`
 * non significa "colora di rosso" ma "leggi `polygon.red`". Un test che
 * chiamasse gli accessor solo se sono funzioni non se ne accorgerebbe.
 *
 * Ogni prop passata a `<Globe>` deve stare o in `PLAIN_PROPS` o in
 * `ACCESSOR_CONTRACTS`: una prop nuova senza contratto fa fallire il test.
 * Vedi CLAUDE.md, "Decisioni prese".
 */

const spy = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))

vi.mock('react-globe.gl', () => ({
  default: (props: Record<string, unknown>) => {
    spy.props = props
    return null
  },
}))

/** Props di configurazione: valori usati così come sono, non per poligono. */
const PLAIN_PROPS = new Set([
  'width',
  'height',
  'backgroundColor',
  'globeImageUrl',
  'globeMaterial',
  'showAtmosphere',
  'atmosphereColor',
  'atmosphereAltitude',
  'polygonsData',
  'polygonsTransitionDuration',
])

const CSS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\))$/i

function expectColor(value: unknown, where: string) {
  expect(typeof value, `${where}: atteso un colore, ricevuto ${String(value)}`).toBe('string')
  expect(String(value), `${where}: "${String(value)}" non è un colore CSS`).toMatch(CSS_COLOR)
}

interface AccessorContract {
  what: string
  /** Come la libreria ottiene il valore. Default: `accessorFn(prop)(poligono)`. */
  invoke?: (propValue: unknown, polygon: CountryPolygon) => unknown
  check: (value: unknown, polygon: CountryPolygon) => void
}

const ACCESSOR_CONTRACTS: Record<string, AccessorContract> = {
  polygonGeoJsonGeometry: {
    what: 'una geometria GeoJSON con coordinate',
    check: (value, polygon) => {
      const geometry = value as { type?: unknown; coordinates?: unknown } | undefined
      expect(geometry, `${polygon.featureName}: geometria assente`).toBeDefined()
      expect(['Polygon', 'MultiPolygon']).toContain(geometry?.type)
      expect(Array.isArray(geometry?.coordinates)).toBe(true)
      expect((geometry?.coordinates as unknown[]).length).toBeGreaterThan(0)
    },
  },
  polygonCapColor: {
    what: 'il colore della superficie',
    check: (value, polygon) => expectColor(value, polygon.featureName),
  },
  polygonSideColor: {
    what: 'il colore dei lati',
    check: (value, polygon) => expectColor(value, polygon.featureName),
  },
  polygonStrokeColor: {
    what: 'il colore del bordo',
    check: (value, polygon) => expectColor(value, polygon.featureName),
  },
  polygonAltitude: {
    what: "l'altitudine",
    check: (value, polygon) => {
      // three-globe fa `+altitudeAccessor(polygon)`: un NaN romperebbe la mesh.
      expect(Number.isFinite(Number(value)), `${polygon.featureName}: altitudine ${String(value)}`).toBe(true)
      expect(Number(value)).toBeGreaterThanOrEqual(0)
    },
  },
  polygonLabel: {
    what: 'il contenuto del tooltip',
    check: (value, polygon) => {
      expect(typeof value, `${polygon.featureName}: label non è una stringa`).toBe('string')
      // Le feature non risolvibili non hanno tooltip: sono non interattive.
      if (polygon.iso === null) {
        expect(String(value).trim()).toBe('')
      } else {
        expect(String(value)).toContain(polygon.iso)
      }
    },
  },
  showPointerCursor: {
    what: 'se mostrare il cursore a manina',
    // Firma propria: globe.gl la chiama con (objType, objData).
    invoke: (propValue, polygon) =>
      typeof propValue === 'function'
        ? (propValue as (type: string, data: object) => boolean)('polygon', polygon)
        : propValue,
    check: (value, polygon) => {
      expect(typeof value).toBe('boolean')
      // Non risolvibile = non interattivo: niente cursore.
      expect(value).toBe(polygon.iso !== null)
    },
  },
  onPolygonHover: {
    what: "l'handler di hover",
    invoke: (propValue, polygon) => (propValue as (p: object | null) => void)(polygon),
    check: (value) => expect(value).toBeUndefined(),
  },
  onPolygonClick: {
    what: "l'handler di click",
    invoke: (propValue, polygon) =>
      (propValue as (p: object, e: MouseEvent, c: unknown) => void)(
        polygon,
        new MouseEvent('click'),
        { lat: 0, lng: 0, altitude: 0 },
      ),
    check: (value) => expect(value).toBeUndefined(),
  },
}

beforeAll(() => {
  // jsdom non implementa il layout: senza questi `useElementSize` resta a 0x0
  // e il <Globe> non verrebbe montato per un motivo che nel browser non esiste.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  Element.prototype.getBoundingClientRect = () =>
    ({ width: 900, height: 500, top: 0, left: 0, right: 900, bottom: 500, x: 0, y: 0 }) as DOMRect

  // Stesso corpo che serve il dev server, letto dal file committato.
  const body = readFileSync(resolve(process.cwd(), 'public/data/countries-110m.geojson'), 'utf8')
  globalThis.fetch = vi.fn(
    async () =>
      ({
        ok: true,
        status: 200,
        json: async () => JSON.parse(body),
      }) as unknown as Response,
  ) as unknown as typeof fetch
})

beforeEach(async () => {
  spy.props = null
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

/** Monta il globo reale e restituisce le props ricevute da `<Globe>`. */
async function mountGlobe(selectedIso: string | null = null) {
  const { default: GlobeView } = await import('./GlobeView')
  const selected: string[] = []
  render(<GlobeView onSelectCountry={(iso) => selected.push(iso)} selectedIso={selectedIso} />)

  await waitFor(() => {
    expect(Array.isArray(spy.props?.polygonsData)).toBe(true)
  })

  const props = spy.props as Record<string, unknown>
  return { props, polygons: props.polygonsData as CountryPolygon[], selected }
}

describe('contratto con react-globe.gl', () => {
  it('ogni prop passata a <Globe> è coperta da un contratto', async () => {
    const { props } = await mountGlobe()

    const uncovered = Object.keys(props).filter(
      (name) => !PLAIN_PROPS.has(name) && !(name in ACCESSOR_CONTRACTS),
    )

    expect(
      uncovered,
      `Prop senza contratto: ${uncovered.join(', ')}. ` +
        'Aggiungila a ACCESSOR_CONTRACTS (o a PLAIN_PROPS se non è per poligono).',
    ).toEqual([])
  })

  it('il dataset arriva completo al layer dei poligoni', async () => {
    const { polygons } = await mountGlobe()

    expect(polygons).toHaveLength(177)
    expect(polygons.filter((polygon) => polygon.iso !== null)).toHaveLength(175)
    expect(polygons.filter((polygon) => polygon.iso === null).map((p) => p.featureName).sort()).toEqual([
      'Northern Cyprus',
      'Somaliland',
    ])
  })

  for (const [scenario, selectedIso, marked] of [
    ['nessuna selezione, niente di visitato', null, [] as string[]],
    ['un Paese selezionato e alcuni visitati', 'IT', ['IT', 'JP', 'BR']],
  ] as const) {
    it(`ogni accessor risponde correttamente su tutti i poligoni — ${scenario}`, async () => {
      for (const code of marked) {
        await useTravelStore.getState().markVisited(code)
      }

      const { props, polygons } = await mountGlobe(selectedIso)

      for (const [name, contract] of Object.entries(ACCESSOR_CONTRACTS)) {
        expect(props, `<Globe> non riceve la prop ${name}`).toHaveProperty(name)
        const propValue = props[name]

        for (const polygon of polygons) {
          // Se un accessor lancia, l'eccezione esce di qui e il test fallisce.
          const value = contract.invoke
            ? contract.invoke(propValue, polygon)
            : accessorFn(propValue)(polygon)

          contract.check(value, polygon)
        }
      }
    })
  }

  it('il click su una feature non risolvibile non cambia nulla', async () => {
    const { props, polygons, selected } = await mountGlobe()
    const onClick = props.onPolygonClick as (p: object, e: MouseEvent, c: unknown) => void

    const unresolved = polygons.filter((polygon) => polygon.iso === null)
    expect(unresolved.length).toBe(2)

    for (const polygon of unresolved) {
      onClick(polygon, new MouseEvent('click'), { lat: 0, lng: 0, altitude: 0 })
    }
    expect(selected).toEqual([])

    // Mentre un Paese risolvibile apre i dettagli, senza toccare lo stato.
    const italy = polygons.find((polygon) => polygon.iso === 'IT')!
    onClick(italy, new MouseEvent('click'), { lat: 0, lng: 0, altitude: 0 })
    expect(selected).toEqual(['IT'])
    expect(useTravelStore.getState().manuallyMarked).toEqual([])
  })
})
