import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import { Color, MeshPhongMaterial } from 'three'
import { loadCountryPolygons } from '../../data/countries/geoData'
import type { CountryPolygon } from '../../data/countries/geoData'
import { logGeoDiagnostics } from '../../utils/geoDiagnostics'
import { useElementSize } from '../../hooks/useElementSize'
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal'
import { useVisitedCodes } from '../../hooks/useVisitedCodes'
import { useVisitedTransitions } from '../../hooks/useVisitedTransitions'
import { useTravelStore } from '../../store/travelStore'
import { useTranslation } from '../../i18n/useTranslation'
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
  | { status: 'error'; messageKey: 'home.globe.mapFailed' }

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
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const { width, height } = useElementSize(containerRef)

  /**
   * Quando Home viene nascosta — l'utente naviga su un'altra pagina — il
   * contenitore misura 0x0. Se `<Globe>` si smontasse lì, al ritorno
   * andrebbero ricostruite tutte le mesh: ~300 ms e un contesto WebGL nuovo.
   * Si tiene quindi l'ultima dimensione valida, e il globo resta in vita.
   */
  const [stableSize, setStableSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (width > 0 && height > 0) setStableSize({ width, height })
  }, [width, height])

  /**
   * Le stesse misure a zero dicono anche che il globo non si vede: si ferma
   * il ciclo di rendering invece di disegnare a vuoto trenta volte al secondo
   * mentre l'utente guarda le statistiche.
   */
  const onScreen = width > 0 && height > 0
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    if (onScreen) globe.resumeAnimation()
    else globe.pauseAnimation()
  }, [onScreen])

  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [hovered, setHovered] = useState<CountryPolygon | null>(null)

  const visited = useVisitedCodes()
  // I Paesi che hanno appena cambiato stato sfumano invece di scattare.
  const { progressFor, version: transitionVersion } = useVisitedTransitions(visited)
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
    const mountedAt = performance.now()

    loadCountryPolygons()
      .then((polygons) => {
        if (cancelled) return
        logGeoDiagnostics(polygons)
        if (import.meta.env.DEV) {
          console.log(
            `%c[globe] primi poligoni pronti dopo ${(performance.now() - mountedAt).toFixed(0)} ms dal mount`,
            'color:#38bdf8',
          )
        }
        setGeo({ status: 'ready', polygons })
      })
      .catch(() => {
        if (cancelled) return
        setGeo({
          status: 'error',
          messageKey: 'home.globe.mapFailed' as const,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  // I poligoni entrano in scena solo quando anche i dati salvati sono pronti:
  // così non si vede un lampeggio da "tutto grigio" a "colorato".
  const polygons = geo.status === 'ready' && dataReady ? geo.polygons : undefined

  // ...e ci entrano a ondate, non tutti in una volta: three-globe costruisce
  // le mesh in modo sincrono e il dataset intero bloccherebbe il thread.
  const reveal = useProgressiveReveal(polygons)

  // Quanto ci mette il globo a essere completo, dal montaggio. È il numero
  // che l'utente percepisce davvero, e servirà di nuovo alla fase 6.
  const mountedAtRef = useRef(performance.now())
  useEffect(() => {
    if (!import.meta.env.DEV || !reveal.complete) return
    console.log(
      `%c[globe] ${reveal.total} Paesi sul globo dopo ${(performance.now() - mountedAtRef.current).toFixed(0)} ms dal mount`,
      'color:#38bdf8',
    )
  }, [reveal.complete, reveal.total])

  // L'evidenziazione segue la selezione quando c'è, altrimenti il puntatore.
  const highlightedIso = selectedIso ?? hovered?.iso ?? null

  const capColor = useCallback(
    (polygon: object) => {
      const { iso } = polygon as CountryPolygon
      return polygonCapColor({
        iso,
        visited,
        hoveredIso: highlightedIso,
        ...(iso === null ? {} : { transition: progressFor(iso) }),
      })
    },
    // `transitionVersion` cambia a ogni passo: serve a far riapplicare
    // l'accessor mentre il colore sfuma.
    [highlightedIso, progressFor, transitionVersion, visited],
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

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-base-900">
      {stableSize.width > 0 && stableSize.height > 0 && (
        <Globe
          ref={globeRef}
          width={stableSize.width}
          height={stableSize.height}
          backgroundColor={COLOR_BACKGROUND}
          globeImageUrl={null}
          showAtmosphere
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.18}
          globeMaterial={globeMaterial}
          polygonsData={reveal.visible}
          polygonGeoJsonGeometry={geoJsonGeometry}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonLabel={label}
          polygonsTransitionDuration={0}
          onPolygonHover={handleHover}
          onPolygonClick={handleClick}
          showPointerCursor={showPointerCursor}
        />
      )}

      {geo.status === 'error' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5">
          <p
            aria-live="polite"
            className="rounded-full border border-red-500/40 bg-red-950/70 px-4 py-2 text-sm text-red-200"
          >
            {t('home.globe.mapFailed')}
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
