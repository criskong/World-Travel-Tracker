import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

/**
 * Globo a schermo intero. Il click marca il Paese come visitato passando
 * dallo store, che persiste su IndexedDB.
 */
export default function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(containerRef)

  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [hovered, setHovered] = useState<CountryPolygon | null>(null)

  const visited = useVisitedCodes()
  const toggleVisited = useTravelStore((state) => state.toggleVisited)
  const hydrationStatus = useTravelStore((state) => state.status)
  const storageMessage = useTravelStore((state) => state.storageMessage)
  const lastError = useTravelStore((state) => state.lastError)

  const dataReady = hydrationStatus === 'ready'

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

  const hoveredIso = hovered?.iso ?? null

  const capColor = useCallback(
    (polygon: object) =>
      polygonCapColor({ iso: (polygon as CountryPolygon).iso, visited, hoveredIso }),
    [hoveredIso, visited],
  )

  const altitude = useCallback(
    (polygon: object) =>
      polygonAltitude({ iso: (polygon as CountryPolygon).iso, visited, hoveredIso }),
    [hoveredIso, visited],
  )

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

      if (import.meta.env.DEV) {
        console.log({ iso: item.iso, name: item.country?.name ?? item.featureName })
      }
      void toggleVisited(item.iso)
    },
    [toggleVisited],
  )

  const showPointerCursor = useCallback(
    (_objType: string, objData: object) => (objData as CountryPolygon)?.iso !== null,
    [],
  )

  const visitedCount = visited.size

  const hint = useMemo(() => {
    if (geo.status === 'error') return geo.message
    if (geo.status === 'loading' || !dataReady) return 'Caricamento…'
    return visitedCount === 0
      ? 'Clicca un Paese per marcarlo come visitato.'
      : `${visitedCount} ${visitedCount === 1 ? 'Paese visitato' : 'Paesi visitati'}`
  }, [dataReady, geo, visitedCount])

  const isError = geo.status === 'error' || lastError !== null

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
          polygonCapColor={capColor}
          polygonSideColor={COLOR_SIDE}
          polygonStrokeColor={COLOR_STROKE}
          polygonAltitude={altitude}
          polygonLabel={label}
          polygonsTransitionDuration={200}
          onPolygonHover={handleHover}
          onPolygonClick={handleClick}
          showPointerCursor={showPointerCursor}
        />
      )}

      {storageMessage !== null && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
          <p
            role="status"
            className="max-w-md rounded-xl border border-amber-500/40 bg-amber-950/70 px-4 py-2 text-center text-sm text-amber-100"
          >
            {storageMessage}
          </p>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6"
        aria-live="polite"
      >
        <p
          className={`rounded-full border px-4 py-2 text-sm ${
            isError
              ? 'border-red-500/40 bg-red-950/60 text-red-200'
              : 'border-white/10 bg-black/40 text-slate-300'
          }`}
        >
          {lastError ?? hint}
        </p>
      </div>

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

/** Il tooltip di react-globe.gl accetta HTML: i nomi vanno sempre sanificati. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
