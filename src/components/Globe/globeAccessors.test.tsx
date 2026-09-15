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
import type { GlobeLabel } from './labelAnchors'
import { GEOJSON_FILENAME } from '../../data/countries/dataset'

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

/** Letto dal dataset committato in `beforeAll`, non scritto a mano. */
let featureCount = 0

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
  'labelsData',
  'labelIncludeDot',
  'labelResolution',
  'labelsTransitionDuration',
])

/**
 * Le etichette hanno i loro accessor, applicati agli oggetti di `labelsData`
 * e non ai poligoni. Stesse regole: funzioni, mai stringhe.
 */
const LABEL_ACCESSOR_CONTRACTS: Record<string, (value: unknown, label: GlobeLabel) => void> = {
  labelLat: (value, label) => {
    expect(typeof value).toBe('number')
    expect(Math.abs(value as number), `${label.iso}: latitudine ${String(value)}`).toBeLessThanOrEqual(90)
  },
  labelLng: (value, label) => {
    expect(typeof value).toBe('number')
    expect(Math.abs(value as number), `${label.iso}: longitudine ${String(value)}`).toBeLessThanOrEqual(180)
  },
  labelText: (value, label) => {
    expect(typeof value).toBe('string')
    expect((value as string).length, `${label.iso}: testo vuoto`).toBeGreaterThan(0)
    // La font di three-globe non ha accenti: il testo deve gia esserne privo.
    expect(value as string).toBe((value as string).normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  },
  labelSize: (value) => {
    expect(Number.isFinite(Number(value))).toBe(true)
    expect(Number(value)).toBeGreaterThan(0)
  },
  labelColor: (value, label) => expectColor(value, label.iso),
  labelAltitude: (value) => expect(Number(value)).toBeGreaterThan(0),
}

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
  // Il nome arriva da `dataset.ts`: il doppio serve il dataset vero dell'app.
  const body = readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8')
  featureCount = (JSON.parse(body) as { features: unknown[] }).features.length
  globalThis.fetch = vi.fn(
    async () =>
      ({
        ok: true,
        status: 200,
        // `geoData` usa `text()` per poter misurare rete e parsing separatamente;
        // `json()` resta per non legare il doppio a quel dettaglio.
        text: async () => body,
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

  // Il globo riceve i Paesi a gruppi, un frame per gruppo: il contratto va
  // verificato sull'insieme completo, quindi si aspetta la fine della
  // rivelazione. L'attesa è anche la prova che la rivelazione arriva in fondo.
  await waitFor(
    () => {
      expect((spy.props?.polygonsData as unknown[] | undefined)?.length).toBe(featureCount)
    },
    { timeout: 5000 },
  )

  const props = spy.props as Record<string, unknown>
  return { props, polygons: props.polygonsData as CountryPolygon[], selected }
}

describe('contratto con react-globe.gl', () => {
  it('ogni prop passata a <Globe> è coperta da un contratto', async () => {
    const { props } = await mountGlobe()

    const uncovered = Object.keys(props).filter(
      (name) =>
        !PLAIN_PROPS.has(name) &&
        !(name in ACCESSOR_CONTRACTS) &&
        !(name in LABEL_ACCESSOR_CONTRACTS) &&
        !['onLabelClick', 'onLabelHover'].includes(name),
    )

    expect(
      uncovered,
      `Prop senza contratto: ${uncovered.join(', ')}. ` +
        'Aggiungila a ACCESSOR_CONTRACTS (o a PLAIN_PROPS se non è per poligono).',
    ).toEqual([])
  })

  it('il dataset arriva completo al layer dei poligoni', async () => {
    const { polygons } = await mountGlobe()

    expect(polygons).toHaveLength(242)
    expect(polygons.filter((polygon) => polygon.iso !== null)).toHaveLength(239)
    expect(
      polygons
        .filter((polygon) => polygon.iso === null)
        .map((polygon) => polygon.featureName)
        .sort(),
    ).toEqual(['Northern Cyprus', 'Siachen Glacier', 'Somaliland'])
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

  it('le etichette: alcuni nomi alla vista iniziale, ognuno valido, e cliccarne uno apre il Paese', async () => {
    const { props, selected } = await mountGlobe()
    const labels = props.labelsData as GlobeLabel[]

    // Alla vista di default ci stanno i Paesi grandi, non tutti e 195.
    expect(labels.length).toBeGreaterThan(5)
    expect(labels.length).toBeLessThan(80)
    expect(labels.map((label) => label.iso)).toContain('RU')
    expect(labels.map((label) => label.iso)).not.toContain('MC')

    for (const [name, check] of Object.entries(LABEL_ACCESSOR_CONTRACTS)) {
      expect(props, `<Globe> non riceve la prop ${name}`).toHaveProperty(name)
      for (const label of labels) check(accessorFn(props[name])(label), label)
    }

    const onLabelClick = props.onLabelClick as (l: object) => void
    onLabelClick(labels.find((label) => label.iso === 'RU')!)
    expect(selected).toEqual(['RU'])
  })

  it('il click su una feature non risolvibile non cambia nulla', async () => {
    const { props, polygons, selected } = await mountGlobe()
    const onClick = props.onPolygonClick as (p: object, e: MouseEvent, c: unknown) => void

    const unresolved = polygons.filter((polygon) => polygon.iso === null)
    expect(unresolved.length).toBe(3)

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
