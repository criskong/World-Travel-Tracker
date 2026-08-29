import { getCountry } from './countries'
import { GEOJSON_FILENAME, GEOJSON_PUBLIC_PATH } from './dataset'
import { countPolygons, countVertices, isCountryGeometry, reduceGeometry } from './geometrySimplify'
import { featureDisplayName, resolveIso } from './isoResolver'
import {
  clearCachedDatasets,
  pruneCachedDatasets,
  readCachedDataset,
  writeCachedDataset,
} from '../../services/storage'
import type { CountryFeature } from './isoResolver'
import type { CountryGeometry } from './geometrySimplify'
import type { Country } from '../../types'

/** Percorso del dataset committato. Il nome del file vive in `dataset.ts`. */
const GEOJSON_URL = `${import.meta.env.BASE_URL}${GEOJSON_PUBLIC_PATH}`

/** Una feature del GeoJSON già arricchita con l'esito della risoluzione ISO. */
export interface CountryPolygon {
  /** Chiave stabile per React e per i confronti. */
  id: string
  feature: CountryFeature
  /** Nome così come compare nel dataset geografico. */
  featureName: string
  /** Codice ISO alpha-2, o `null` se la feature non è risolvibile. */
  iso: string | null
  /** Paese dalla fonte di verità. `null` insieme a `iso`. */
  country: Country | null
  /** `true` quando l'assenza di codice ISO è attesa (territorio non ISO). */
  expectedUnassigned: boolean
}

/** Da dove è arrivato il dataset in questa sessione. Serve alla diagnostica. */
export type DatasetSource = 'cache' | 'network'

let cache: Promise<CountryPolygon[]> | null = null
let lastSource: DatasetSource | null = null

/** Da dove è stato letto il dataset, o `null` se non è ancora stato caricato. */
export function datasetSource(): DatasetSource | null {
  return lastSource
}

function toPolygons(features: CountryFeature[]): CountryPolygon[] {
  return features.map((feature, index) => {
    const { code, expectedUnassigned } = resolveIso(feature)
    const featureName = featureDisplayName(feature)

    // La geometria alleggerita SOSTITUISCE l'originale: `feature.geometry`
    // resta l'unica fonte, così non esistono due versioni della stessa forma.
    // Il riferimento è stabile per tutta la sessione, e questo è essenziale:
    // three-globe confronta `coords` per identità e ricostruirebbe la mesh a
    // ogni update se cambiasse.
    const geometry = isCountryGeometry(feature.geometry)
      ? reduceGeometry(feature.geometry)
      : feature.geometry

    return {
      id: code ?? `unresolved:${featureName}:${index}`,
      feature: { ...feature, geometry },
      featureName,
      iso: code,
      country: getCountry(code) ?? null,
      expectedUnassigned,
    }
  })
}

/** Somma una misura della geometria su tutti i poligoni. */
function sumGeometry(polygons: CountryPolygon[], measure: (g: CountryGeometry) => number): number {
  return polygons.reduce(
    (total, polygon) =>
      total + (isCountryGeometry(polygon.feature.geometry) ? measure(polygon.feature.geometry) : 0),
    0,
  )
}

/**
 * Rimanda un lavoro a quando il thread principale è libero.
 * Scrivere 3 MB su IndexedDB mentre three-globe costruisce le mesh vorrebbe
 * dire contendersi lo stesso thread nel momento peggiore possibile.
 */
function whenIdle(task: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (callback: () => void) => number })
    .requestIdleCallback
  if (typeof idle === 'function') {
    idle(task)
  } else {
    setTimeout(task, 2000)
  }
}

/** Scarica il dataset e ne programma la messa in cache. */
async function fetchDataset(): Promise<string> {
  const response = await fetch(GEOJSON_URL)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  // `text()` invece di `json()`: così si misurano separatamente rete e
  // parsing, e si ha il corpo da mettere in cache esattamente com'è.
  const body = await response.text()

  whenIdle(() => {
    void writeCachedDataset(GEOJSON_FILENAME, body).then((saved) => {
      // Un dataset vecchio resterebbe a occupare megabyte che nessuno legge.
      if (saved) void pruneCachedDatasets(GEOJSON_FILENAME)
    })
  })

  return body
}

/** Trasforma il testo del dataset nei poligoni pronti per il globo. */
function build(body: string, source: DatasetSource, startedAt: number, readAt: number) {
  const data = JSON.parse(body) as { features?: CountryFeature[] }
  const parsedAt = performance.now()

  if (!Array.isArray(data.features) || data.features.length === 0) {
    throw new Error('formato GeoJSON non valido')
  }
  const polygons = toPolygons(data.features)
  const resolvedAt = performance.now()

  if (import.meta.env.DEV) {
    const ms = (from: number, to: number) => `${(to - from).toFixed(0)} ms`
    console.log(
      `%c[geojson] ${GEOJSON_FILENAME}`,
      'color:#38bdf8',
      `${(body.length / 1024).toFixed(0)} KB · ${data.features.length} feature · ` +
        `${sumGeometry(polygons, countPolygons)} mesh · ${sumGeometry(polygons, countVertices)} vertici\n` +
        `  ${source === 'cache' ? 'cache   ' : 'rete    '}${ms(startedAt, readAt)}\n` +
        `  parse   ${ms(readAt, parsedAt)}\n` +
        `  resolve ${ms(parsedAt, resolvedAt)}\n` +
        `  TOTALE  ${ms(startedAt, resolvedAt)}`,
    )
  }

  return polygons
}

/**
 * Legge il dataset, dalla copia locale se c'è.
 *
 * La cache è un'ottimizzazione, non una fonte di verità: `readCachedDataset`
 * non lancia mai, e quando restituisce `null` si va in rete esattamente come
 * prima. Un problema di storage non può impedire al globo di comparire.
 */
async function loadDataset(): Promise<CountryPolygon[]> {
  const startedAt = performance.now()

  const cached = await readCachedDataset(GEOJSON_FILENAME)
  if (cached !== null) {
    try {
      const polygons = build(cached, 'cache', startedAt, performance.now())
      lastSource = 'cache'
      return polygons
    } catch {
      // Copia locale illeggibile: la si butta e si riscarica. Senza questa
      // via d'uscita una cache rovinata renderebbe l'app inutilizzabile per
      // sempre, e l'utente non avrebbe modo di accorgersene o di rimediare.
      await clearCachedDatasets()
    }
  }

  const restartedAt = performance.now()
  const body = await fetchDataset()
  const polygons = build(body, 'network', restartedAt, performance.now())
  lastSource = 'network'
  return polygons
}

/**
 * Carica e prepara il GeoJSON una sola volta per sessione: il parsing di
 * ~3 MB non deve ripetersi a ogni render del globo.
 */
export function loadCountryPolygons(): Promise<CountryPolygon[]> {
  if (!cache) {
    cache = loadDataset().catch((error: unknown) => {
      // Un fallimento non deve restare in cache: al prossimo tentativo si riprova.
      cache = null
      throw error instanceof Error ? error : new Error(String(error))
    })
  }
  return cache
}
