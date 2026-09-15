import type { CountryPolygon } from '../../data/countries/geoData'

/**
 * Dove e quando scrivere il nome di un Paese sul globo.
 *
 * Logica pura: dai poligoni si ricava per ogni Paese un punto di ancoraggio e
 * quanto e largo, e da zoom e nome si decide se il nome CI STA. Su un globo
 * grande quanto un telefono i 195 nomi insieme sarebbero una nuvola di
 * lettere; una cartina vera li mostra man mano che ci si avvicina, e qui si
 * fa lo stesso.
 */

export interface LabelAnchor {
  iso: string
  lat: number
  lng: number
  /**
   * Larghezza est-ovest del Paese, in gradi d'arco alla sua latitudine.
   * E la misura che conta: il nome si scrive in orizzontale.
   */
  spanDeg: number
}

export interface GlobeLabel extends LabelAnchor {
  text: string
}

type Ring = number[][]

/** Area con segno di un anello (formula del laccio), in gradi quadrati corretti per la latitudine. */
function ringArea(ring: Ring, cosLat: number): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [x1 = 0, y1 = 0] = ring[j]!
    const [x2 = 0, y2 = 0] = ring[i]!
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum / 2) * cosLat
}

/** Riporta le longitudini su un intervallo continuo quando l'anello scavalca l'antimeridiano. */
function unwrapLongitudes(ring: Ring): Ring {
  let min = Infinity
  let max = -Infinity
  for (const [lng = 0] of ring) {
    if (lng < min) min = lng
    if (lng > max) max = lng
  }
  if (max - min <= 180) return ring
  return ring.map(([lng = 0, lat = 0]) => [lng < 0 ? lng + 360 : lng, lat])
}

function outerRings(geometry: { type: string; coordinates: unknown }): Ring[] {
  if (geometry.type === 'Polygon') return [(geometry.coordinates as Ring[])[0]!]
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as Ring[][]).map((polygon) => polygon[0]!)
  }
  return []
}

function meanLatitude(ring: Ring): number {
  let sum = 0
  for (const [, lat = 0] of ring) sum += lat
  return sum / ring.length
}

/** Baricentro dell'anello (formula del laccio). Per i Paesi molto concavi cade un po' fuori: accettabile per un'etichetta. */
function centroid(ring: Ring): { lat: number; lng: number } {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [x1 = 0, y1 = 0] = ring[j]!
    const [x2 = 0, y2 = 0] = ring[i]!
    const cross = x1 * y2 - x2 * y1
    area += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (Math.abs(area) < 1e-9) {
    // Degenerato: la media dei vertici.
    const lng = ring.reduce((sum, [x = 0]) => sum + x, 0) / ring.length
    return { lat: meanLatitude(ring), lng: normalizeLng(lng) }
  }
  area *= 3
  return { lat: cy / area, lng: normalizeLng(cx / area) }
}

function normalizeLng(lng: number): number {
  return lng > 180 ? lng - 360 : lng
}

/**
 * Un ancoraggio per Paese, sull'anello piu grande della sua feature piu
 * grande: la Francia si scrive sull'Esagono, non sulla Guyana.
 */
export function buildLabelAnchors(polygons: readonly CountryPolygon[]): LabelAnchor[] {
  const best = new Map<string, { area: number; anchor: LabelAnchor }>()

  for (const polygon of polygons) {
    if (polygon.iso === null) continue
    for (const raw of outerRings(polygon.feature.geometry as { type: string; coordinates: unknown })) {
      if (!raw || raw.length < 3) continue
      const ring = unwrapLongitudes(raw)
      const cosLat = Math.max(0.05, Math.cos((meanLatitude(ring) * Math.PI) / 180))
      const area = ringArea(ring, cosLat)
      const current = best.get(polygon.iso)
      if (current && current.area >= area) continue

      let minLng = Infinity
      let maxLng = -Infinity
      for (const [lng = 0] of ring) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
      }
      const center = centroid(ring)
      // Gli anelli non sono rettangoli: la larghezza utile e meno del bbox.
      const spanDeg = (maxLng - minLng) * Math.cos((center.lat * Math.PI) / 180) * 0.8
      best.set(polygon.iso, { area, anchor: { iso: polygon.iso, ...center, spanDeg } })
    }
  }

  return [...best.values()].map((entry) => entry.anchor)
}

/** Apertura verticale della camera di globe.gl, in gradi. */
const CAMERA_FOV_DEG = 50
/** Quanto alto deve essere un nome sullo schermo per leggersi. */
const TARGET_TEXT_PX = 11

/**
 * Altezza del testo, in gradi d'arco, perche sullo schermo misuri
 * `TARGET_TEXT_PX`. Al centro del globo un grado d'arco occupa
 * `H / (2 tan(fov/2)) * (pi/180) / altitudine` pixel, con l'altitudine della
 * camera in raggi terrestri (globe.gl: 2,5 di default).
 */
export function labelSizeDeg(altitude: number, viewportHeightPx: number): number {
  if (viewportHeightPx <= 0 || altitude <= 0) return 0
  const pxPerDeg =
    (viewportHeightPx / (2 * Math.tan((CAMERA_FOV_DEG / 2) * (Math.PI / 180)))) *
    (Math.PI / 180) /
    altitude
  return TARGET_TEXT_PX / pxPerDeg
}

/**
 * Quantizza l'altitudine a passi del ~26% (terzi di ottava). Ogni cambio di
 * misura ricostruisce la geometria di tutte le scritte: durante uno zoom
 * continuo si vuole che succeda qualche volta, non a ogni frame.
 */
export function quantizeAltitude(altitude: number): number {
  if (altitude <= 0) return 0
  return Math.pow(2, Math.round(Math.log2(altitude) * 3) / 3)
}

/** Larghezza media di un glifo rispetto all'altezza, per la font di three-globe. */
const GLYPH_ASPECT = 0.62
/** Margine perche il nome non tocchi i confini. */
const FIT_MARGIN = 1.15

/**
 * La font incorporata in three-globe non ha lettere accentate: "Peru" si
 * legge, "Per" seguito da un buco no. Sulle cartine internazionali e l'uso.
 */
export function labelText(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd')
    .replace(/[’']/g, "'")
}

/** I Paesi il cui nome, a questa misura, sta dentro il Paese stesso. */
export function selectLabels(
  anchors: readonly LabelAnchor[],
  nameOf: (iso: string) => string,
  sizeDeg: number,
): GlobeLabel[] {
  if (sizeDeg <= 0) return []
  const labels: GlobeLabel[] = []
  for (const anchor of anchors) {
    const text = labelText(nameOf(anchor.iso))
    const widthDeg = text.length * sizeDeg * GLYPH_ASPECT * FIT_MARGIN
    if (widthDeg <= anchor.spanDeg) labels.push({ ...anchor, text })
  }
  return labels
}
