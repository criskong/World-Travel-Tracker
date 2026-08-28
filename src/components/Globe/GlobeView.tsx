import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { Color, MeshPhongMaterial } from 'three'
import { loadCountryPolygons } from '../../data/countries/geoData'
import type { CountryPolygon } from '../../data/countries/geoData'
import { logGeoDiagnostics } from '../../utils/geoDiagnostics'
import { useElementSize } from '../../hooks/useElementSize'
import { useVisitedCodes } from '../../hooks/useVisitedCodes'
import { useTravelStore } from '../../store/travelStore'
import {
  COLOR_BACKGROUND,
  COLOR_GLOBE,
  COLOR_SIDE,
  COLOR_STROKE,
  polygonAltitude,
  polygonCapColor,
} from './globeColors'

/** Sfera di base: creata una sola volta, non per render. */
const globeMaterial = new MeshPhongMaterial({
  color: new Color(COLOR_GLOBE),
  shininess: 6,
})

type GeoState =
  | { status: 'loading' }
  | { status: 'ready'; polygons: CountryPolygon[] }
  | { status: 'error'; message: string }

export interface GlobeViewProps {
  /**
   * Chiamata al click su un Paese risolvibile. Il globo non modifica mai lo
   * stato "visitato": apre CountryDetails (CLAUDE.md, "Decisioni prese").
   */
  onSelectCountry: (iso: string) => void
  /** Paese attualmente aperto in CountryDetails, evidenziato sul globo. */
  selectedIso: string | null
}

/**
 * Contatore di montaggi, per dimostrare che il globo non viene ricreato
 * quando cambiano le statistiche. Vive fuori dal componente perché deve
 * sopravvivere ai render.
 */
let mountCount = 0

/**
 * Globo a schermo intero.
 *
 * `memo`: le props cambiano solo quando cambia la selezione, quindi un
 * aggiornamento delle statistiche non fa nemmeno ri-renderizzare il globo.
 * I colori dei Paesi visitati arrivano da `useVisitedCodes`, che è una
 * sottoscrizione interna: si aggiornano senza toccare la scena.
 */
function GlobeViewComponent({ onSelectCountry, selectedIso }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(containerRef)

  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [hovered, setHovered] = useState<CountryPolygon | null>(null)

  const visited = useVisitedCodes()
  const hydrationStatus = useTravelStore((state) => state.status)
  const dataReady = hydrationStatus === 'ready'

  useEffect(() => {
    if (!import.meta.env.DEV) return
    mountCount += 1
    console.log(
      `%c[globe] mount #${mountCount}`,
      'color:#38bdf8',
      '— se questo numero non cresce mentre cambiano le statistiche, il globo non si sta rimontando',
    )
    return () => {
      console.log('%c[globe] unmount', 'color:#f87171')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    loadCountryPolygons()
      .then((polygons) => {
        if (cancelled) return
        logGeoDiagnostics(polygons)
        setGeo({ status: 'ready', polygons })
      })
      .catch(() => {
        if (cancelled) return
        setGeo({
          status: 'error',
          message: 'Impossibile caricare la mappa dei Paesi. Ricarica la pagina per riprovare.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  // I poligoni entrano in scena solo quando anche i dati salvati sono pronti:
  // così non si vede un lampeggio da "tutto grigio" a "colorato".
  const polygons = geo.status === 'ready' && dataReady ? geo.polygons : undefined

  // L'evidenziazione segue la selezione quando c'è, altrimenti il puntatore.
  const highlightedIso = selectedIso ?? hovered?.iso ?? null

  const capColor = useCallback(
    (polygon: object) =>
      polygonCapColor({
        iso: (polygon as CountryPolygon).iso,
        visited,
        hoveredIso: highlightedIso,
      }),
    [highlightedIso, visited],
  )

  const altitude = useCallback(
    (polygon: object) =>
      polygonAltitude({
        iso: (polygon as CountryPolygon).iso,
        visited,
        hoveredIso: highlightedIso,
      }),
    [highlightedIso, visited],
  )

  /**
   * three-globe legge la geometria con `accessorFn(polygonGeoJsonGeometry)`,
   * il cui default è la stringa `'geometry'` — cioè `polygon.geometry`.
   * La nostra sta annidata in `feature`, perché `CountryPolygon` porta anche
   * `iso` e `country`. Senza questo accessor il layer trova `undefined` e
   * lancia sul primo poligono: sfera e atmosfera restano, i Paesi no.
   */
  const geoJsonGeometry = useCallback(
    (polygon: object) =>
      (polygon as CountryPolygon).feature.geometry as { type: string; coordinates: number[] },
    [],
  )

  /**
   * Colori costanti, ma passati come funzioni e non come stringhe:
   * `accessorFn` interpreta una stringa come NOME DI PROPRIETÀ, quindi
   * `polygonSideColor="rgba(...)"` diventerebbe `polygon['rgba(...)']`, cioè
   * `undefined`, per ogni poligono.
   */
  const sideColor = useCallback(() => COLOR_SIDE, [])
  const strokeColor = useCallback(() => COLOR_STROKE, [])

  const label = useCallback((polygon: object) => {
    const item = polygon as CountryPolygon
    if (item.iso === null) return ''
    const name = item.country?.name ?? item.featureName
    return `
      <div class="globe-tooltip">
        <span class="globe-tooltip__name">${escapeHtml(name)}</span>
        <span class="globe-tooltip__iso">${item.iso}</span>
      </div>
    `
  }, [])

  const handleHover = useCallback((polygon: object | null) => {
    const item = polygon as CountryPolygon | null
    setHovered(item && item.iso !== null ? item : null)
  }, [])

  const handleClick = useCallback(
    (polygon: object) => {
      const item = polygon as CountryPolygon
      // Le feature non risolvibili restano non interattive.
      if (item.iso === null) return
      onSelectCountry(item.iso)
    },
    [onSelectCountry],
  )

  const showPointerCursor = useCallback(
    (_objType: string, objData: object) => (objData as CountryPolygon)?.iso !== null,
    [],
  )

  const hint = useMemo(() => {
    if (geo.status === 'error') return geo.message
    if (geo.status === 'loading' || !dataReady) return 'Caricamento della mappa…'
    return null
  }, [dataReady, geo])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-base-900">
      {width > 0 && height > 0 && (
        <Globe
          width={width}
          height={height}
          backgroundColor={COLOR_BACKGROUND}
          globeImageUrl={null}
          showAtmosphere
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.18}
          globeMaterial={globeMaterial}
          polygonsData={polygons}
          polygonGeoJsonGeometry={geoJsonGeometry}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonLabel={label}
          polygonsTransitionDuration={200}
          onPolygonHover={handleHover}
          onPolygonClick={handleClick}
          showPointerCursor={showPointerCursor}
        />
      )}

      {hint !== null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5">
          <p
            aria-live="polite"
            className={`rounded-full border px-4 py-2 text-sm ${
              geo.status === 'error'
                ? 'border-red-500/40 bg-red-950/70 text-red-200'
                : 'border-edge bg-black/50 text-slate-400'
            }`}
          >
            {hint}
          </p>
        </div>
      )}

      <style>{`
        .scene-tooltip .globe-tooltip {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding: 0.35rem 0.6rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(5, 7, 12, 0.92);
          font-size: 0.8125rem;
          white-space: nowrap;
        }
        .scene-tooltip .globe-tooltip__name { color: #e2e8f0; font-weight: 500; }
        .scene-tooltip .globe-tooltip__iso {
          color: #38bdf8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  )
}

export default memo(GlobeViewComponent)

/** Il tooltip di react-globe.gl accetta HTML: i nomi vanno sempre sanificati. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
