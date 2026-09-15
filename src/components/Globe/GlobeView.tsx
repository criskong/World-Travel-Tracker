import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  buildLabelAnchors,
  labelSizeDeg,
  quantizeAltitude,
  selectLabels,
} from './labelAnchors'
import type { GlobeLabel } from './labelAnchors'
import {
  COLOR_BACKGROUND,
  COLOR_LABEL,
  COLOR_GLOBE,
  COLOR_STROKE,
  polygonAltitude,
  polygonCapColor,
  polygonSideColor,
} from './globeColors'
import { GlobeSky } from './GlobeSky'

/** Sfera di base: creata una sola volta, non per render. */
const globeMaterial = new MeshPhongMaterial({
  color: new Color(COLOR_GLOBE),
  // Un po' di lucido: l'oceano prende il riflesso della luce e la sfera
  // smette di sembrare piatta.
  shininess: 18,
  specular: new Color('#1b4a7a'),
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
  const { t, country: countryLabel } = useTranslation()
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

  /**
   * Rotazione lenta all'apertura: e la cosa che fa sembrare vivo il globo.
   * Si ferma per sempre al primo gesto — continuare a girare mentre si cerca
   * di cliccare un Paese sarebbe solo fastidio — e non parte mai se il
   * sistema chiede animazioni ridotte.
   */
  const [autoRotate, setAutoRotate] = useState(
    () =>
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const stopAutoRotate = useCallback(() => setAutoRotate(false), [])

  useEffect(() => {
    const controls = globeRef.current?.controls() as
      | { autoRotate: boolean; autoRotateSpeed: number }
      | undefined
    if (!controls) return
    controls.autoRotate = autoRotate && onScreen
    controls.autoRotateSpeed = 0.32
  }, [autoRotate, onScreen, stableSize])

  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [hovered, setHovered] = useState<CountryPolygon | null>(null)

  /**
   * I nomi dei Paesi, come su una cartina: compaiono man mano che ci si
   * avvicina, solo dove il nome ci sta dentro il Paese. Dipendono dallo zoom,
   * che si legge dai controlli della camera; l'altitudine e quantizzata
   * perche ogni cambio di misura ricostruisce la geometria di tutte le
   * scritte, e durante uno zoom continuo deve succedere poche volte.
   */
  const [cameraAltitude, setCameraAltitude] = useState(() => quantizeAltitude(2.5))
  useEffect(() => {
    const globe = globeRef.current
    const controls = globe?.controls() as
      | { addEventListener: (type: string, fn: () => void) => void; removeEventListener: (type: string, fn: () => void) => void }
      | undefined
    if (!globe || !controls) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        const next = quantizeAltitude(globe.pointOfView().altitude)
        setCameraAltitude((current) => (current === next ? current : next))
      }, 120)
    }
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('change', onChange)
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [stableSize])

  const anchors = useMemo(
    () => (geo.status === 'ready' ? buildLabelAnchors(geo.polygons) : []),
    [geo],
  )
  const textSizeDeg = useMemo(
    () => labelSizeDeg(cameraAltitude, stableSize.height),
    [cameraAltitude, stableSize.height],
  )
  const labels = useMemo(
    () => selectLabels(anchors, countryLabel, textSizeDeg),
    [anchors, countryLabel, textSizeDeg],
  )
  const labelLat = useCallback((item: object) => (item as GlobeLabel).lat, [])
  const labelLng = useCallback((item: object) => (item as GlobeLabel).lng, [])
  const labelTextOf = useCallback((item: object) => (item as GlobeLabel).text, [])
  const labelSize = useCallback(() => textSizeDeg, [textSizeDeg])
  const labelColor = useCallback(() => COLOR_LABEL, [])
  // Sopra i poligoni, anche quelli in rilievo e in hover.
  const labelAltitude = useCallback(() => 0.04, [])

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
  const sideColor = useCallback(
    (polygon: object) => polygonSideColor({ iso: (polygon as CountryPolygon).iso, visited, hoveredIso: null }),
    [visited],
  )
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

  // Un nome sta sopra il suo Paese e ne intercetta il puntatore: cliccarlo
  // deve fare la stessa cosa che cliccare il Paese.
  const handleLabelClick = useCallback(
    (item: object) => onSelectCountry((item as GlobeLabel).iso),
    [onSelectCountry],
  )
  const handleLabelHover = useCallback(
    (item: object | null) => {
      if (item === null) {
        setHovered(null)
        return
      }
      const { iso } = item as GlobeLabel
      const polygon = geo.status === 'ready' ? geo.polygons.find((p) => p.iso === iso) : undefined
      setHovered(polygon ?? null)
    },
    [geo],
  )

  const showPointerCursor = useCallback(
    (_objType: string, objData: object) => (objData as CountryPolygon)?.iso !== null,
    [],
  )

  return (
    <div
      ref={containerRef}
      onPointerDown={stopAutoRotate}
      className="relative h-full w-full overflow-hidden bg-base-900"
    >
      <GlobeSky />

      {/*
        Il canvas sta sopra il cielo: senza `relative z-10` finirebbe sotto,
        perche un elemento posizionato dipinge sopra uno che sta nel flusso.
      */}
      <div className="relative z-10">
        {stableSize.width > 0 && stableSize.height > 0 && (
          <Globe
            ref={globeRef}
            width={stableSize.width}
            height={stableSize.height}
            backgroundColor={COLOR_BACKGROUND}
            globeImageUrl={null}
            showAtmosphere
            atmosphereColor="#38bdf8"
            atmosphereAltitude={0.22}
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
            labelsData={labels}
            labelLat={labelLat}
            labelLng={labelLng}
            labelText={labelTextOf}
            labelSize={labelSize}
            labelColor={labelColor}
            labelAltitude={labelAltitude}
            labelIncludeDot={false}
            labelResolution={2}
            labelsTransitionDuration={0}
            onLabelClick={handleLabelClick}
            onLabelHover={handleLabelHover}
          />
        )}
      </div>

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
