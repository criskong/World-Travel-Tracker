import { getCountry } from './countries'
import { GEOJSON_PUBLIC_PATH } from './dataset'
import { countPolygons, countVertices, isCountryGeometry, reduceGeometry } from './geometrySimplify'
import { featureDisplayName, resolveIso } from './isoResolver'
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

let cache: Promise<CountryPolygon[]> | null = null

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
 * Carica e prepara il GeoJSON una sola volta per sessione: il parsing di
 * ~800 KB non deve ripetersi a ogni render del globo.
 */
export function loadCountryPolygons(): Promise<CountryPolygon[]> {
  if (!cache) {
    const startedAt = performance.now()

    cache = fetch(GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        // `text()` invece di `json()` per poter misurare separatamente rete e
        // parsing, e per conoscere la dimensione davvero ricevuta.
        return response.text()
      })
      .then((body) => {
        const fetchedAt = performance.now()
        const data = JSON.parse(body) as { features?: CountryFeature[] }
        const parsedAt = performance.now()

        if (!Array.isArray(data.features)) {
          throw new Error('formato GeoJSON non valido')
        }
        const polygons = toPolygons(data.features)
        const resolvedAt = performance.now()

        if (import.meta.env.DEV) {
          const ms = (from: number, to: number) => `${(to - from).toFixed(0)} ms`
          console.log(
            `%c[geojson] ${GEOJSON_URL.split('/').pop()}`,
            'color:#38bdf8',
            `${(body.length / 1024).toFixed(0)} KB · ${data.features.length} feature · ` +
              `${sumGeometry(polygons, countPolygons)} mesh · ${sumGeometry(polygons, countVertices)} vertici\n` +
              `  fetch   ${ms(startedAt, fetchedAt)}\n` +
              `  parse   ${ms(fetchedAt, parsedAt)}\n` +
              `  resolve ${ms(parsedAt, resolvedAt)}\n` +
              `  TOTALE  ${ms(startedAt, resolvedAt)}`,
          )
        }

        return polygons
      })
      .catch((error: unknown) => {
        // Un fallimento non deve restare in cache: al prossimo tentativo si riprova.
        cache = null
        throw error instanceof Error ? error : new Error(String(error))
      })
  }
  return cache
}
