import { getCountry } from './countries'
import { featureDisplayName, resolveIso } from './isoResolver'
import type { CountryFeature } from './isoResolver'
import type { Country } from '../../types'

/** Percorso del dataset committato. Mai un CDN esterno. */
const GEOJSON_URL = `${import.meta.env.BASE_URL}data/countries-110m.geojson`

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
    return {
      id: code ?? `unresolved:${featureName}:${index}`,
      feature,
      featureName,
      iso: code,
      country: getCountry(code) ?? null,
      expectedUnassigned,
    }
  })
}

/**
 * Carica e prepara il GeoJSON una sola volta per sessione: il parsing di
 * ~800 KB non deve ripetersi a ogni render del globo.
 */
export function loadCountryPolygons(): Promise<CountryPolygon[]> {
  if (!cache) {
    cache = fetch(GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json() as Promise<{ features?: CountryFeature[] }>
      })
      .then((data) => {
        if (!Array.isArray(data.features)) {
          throw new Error('formato GeoJSON non valido')
        }
        return toPolygons(data.features)
      })
      .catch((error: unknown) => {
        // Un fallimento non deve restare in cache: al prossimo tentativo si riprova.
        cache = null
        throw error instanceof Error ? error : new Error(String(error))
      })
  }
  return cache
}
