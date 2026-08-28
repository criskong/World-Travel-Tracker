import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { Color, MeshPhongMaterial } from 'three'
import { loadCountryPolygons } from '../../data/countries/geoData'
import type { CountryPolygon } from '../../data/countries/geoData'
import { logGeoDiagnostics } from '../../utils/geoDiagnostics'
import { useElementSize } from '../../hooks/useElementSize'

/** Palette del globo. Fase 1: nessun tema configurabile. */
const COLOR_UNVISITED = 'rgba(148, 163, 184, 0.32)'
const COLOR_UNRESOLVED = 'rgba(100, 116, 139, 0.16)'
const COLOR_HOVER = 'rgba(203, 213, 225, 0.55)'
const COLOR_SELECTED = 'rgba(56, 189, 248, 0.85)'
const COLOR_SIDE = 'rgba(15, 23, 42, 0.65)'
const COLOR_STROKE = 'rgba(15, 23, 42, 0.9)'
const COLOR_GLOBE = '#0b1220'
const COLOR_BACKGROUND = '#05070c'

/** Sfera di base: creata una sola volta, non per render. */
const globeMaterial = new MeshPhongMaterial({
  color: new Color(COLOR_GLOBE),
  shininess: 6,
})

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; polygons: CountryPolygon[] }
  | { status: 'error'; message: string }

/**
 * Globo a schermo intero. Fase 1: dimostra che il GeoJSON renderizza e che
 * il click risale al codice ISO. La selezione vive solo in memoria.
 */
export default function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(containerRef)

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [hovered, setHovered] = useState<CountryPolygon | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false

    loadCountryPolygons()
      .then((polygons) => {
        if (cancelled) return
        logGeoDiagnostics(polygons)
        setState({ status: 'ready', polygons })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          status: 'error',
          message: 'Impossibile caricare la mappa dei Paesi. Ricarica la pagina per riprovare.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const polygons = state.status === 'ready' ? state.polygons : undefined

  const capColor = useCallback(
    (polygon: object) => {
      const item = polygon as CountryPolygon
      if (item.iso === null) return COLOR_UNRESOLVED
      if (selected.has(item.iso)) return COLOR_SELECTED
      if (hovered?.iso === item.iso) return COLOR_HOVER
      return COLOR_UNVISITED
    },
    [hovered, selected],
  )

  const altitude = useCallback(
    (polygon: object) => {
      const item = polygon as CountryPolygon
      if (item.iso === null) return 0.006
      return hovered?.iso === item.iso ? 0.028 : 0.01
    },
    [hovered],
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

  const handleClick = useCallback((polygon: object) => {
    const item = polygon as CountryPolygon
    // Le feature non risolvibili restano non interattive.
    if (item.iso === null) return

    const name = item.country?.name ?? item.featureName
    console.log({ iso: item.iso, name })

    setSelected((current) => {
      const next = new Set(current)
      if (next.has(item.iso as string)) {
        next.delete(item.iso as string)
      } else {
        next.add(item.iso as string)
      }
      return next
    })
  }, [])

  const showPointerCursor = useCallback(
    (_objType: string, objData: object) => (objData as CountryPolygon)?.iso !== null,
    [],
  )

  const selectedCount = selected.size

  const hint = useMemo(() => {
    if (state.status === 'loading') return 'Caricamento della mappa…'
    if (state.status === 'error') return state.message
    return selectedCount === 0
      ? 'Clicca un Paese: il codice ISO viene stampato in console.'
      : `${selectedCount} ${selectedCount === 1 ? 'Paese selezionato' : 'Paesi selezionati'}`
  }, [selectedCount, state])

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

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6"
        aria-live="polite"
      >
        <p
          className={`rounded-full border px-4 py-2 text-sm ${
            state.status === 'error'
              ? 'border-red-500/40 bg-red-950/60 text-red-200'
              : 'border-white/10 bg-black/40 text-slate-300'
          }`}
        >
          {hint}
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
