import type { CountryPolygon } from '../data/countries/geoData'
import { TOTAL_COUNTRIES } from '../data/countries/countries'

export interface GeoDiagnosticsReport {
  totalFeatures: number
  resolvedFeatures: number
  /** Feature senza codice ISO valido. */
  unresolved: Array<{ featureName: string; expectedUnassigned: boolean }>
  /** Paesi della fonte di verità che non hanno geometria nel dataset. */
  countriesWithoutGeometry: number
}

export function buildGeoDiagnostics(polygons: CountryPolygon[]): GeoDiagnosticsReport {
  const unresolved = polygons
    .filter((polygon) => polygon.iso === null)
    .map((polygon) => ({
      featureName: polygon.featureName,
      expectedUnassigned: polygon.expectedUnassigned,
    }))

  const resolvedCodes = new Set(
    polygons.map((polygon) => polygon.iso).filter((iso): iso is string => iso !== null),
  )

  return {
    totalFeatures: polygons.length,
    resolvedFeatures: resolvedCodes.size,
    unresolved,
    countriesWithoutGeometry: TOTAL_COUNTRIES - resolvedCodes.size,
  }
}

/**
 * Stampa in console il resoconto della risoluzione ISO.
 * Solo in sviluppo: in produzione non deve esserci rumore in console.
 */
export function logGeoDiagnostics(polygons: CountryPolygon[]): void {
  if (!import.meta.env.DEV) return

  const report = buildGeoDiagnostics(polygons)

  console.groupCollapsed(
    `[geojson] ${report.unresolved.length} feature su ${report.totalFeatures} NON risolte a un codice ISO`,
  )
  console.log(
    `Feature risolte: ${report.resolvedFeatures}/${report.totalFeatures} · ` +
      `Paesi in countries.ts senza geometria nel dataset: ${report.countriesWithoutGeometry}/${TOTAL_COUNTRIES}`,
  )
  if (report.unresolved.length > 0) {
    console.table(
      report.unresolved.map((item) => ({
        feature: item.featureName,
        motivo: item.expectedUnassigned
          ? 'nessun codice ISO-3166-1 assegnato (atteso)'
          : 'INATTESO: da aggiungere al resolver',
      })),
    )
  }
  console.groupEnd()
}
