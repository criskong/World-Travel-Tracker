/**
 * Riduzione della geometria per il rendering sul globo.
 *
 * Il problema non è il numero di vertici ma il numero di MESH. three-globe
 * crea un oggetto separato per ogni poligono di ogni feature — e con lo stroke
 * attivo sono due draw call ciascuno. Il dataset 50m contiene 1.620 poligoni,
 * cioè ~3.240 draw call per frame: su mobile è lì che il globo si impunta.
 *
 * La grande maggioranza di quei poligoni sono isolotti che alla scala del
 * globo non arrivano a coprire un pixel. Scartarli non toglie nulla di
 * visibile e taglia le mesh di 2,6 volte.
 *
 * REGOLA INVIOLABILE: il poligono più grande di ogni feature non si scarta
 * mai. È ciò che garantisce che nessun Paese sparisca — che è esattamente il
 * motivo per cui siamo passati al 50m (CLAUDE.md, "Decisioni prese").
 */

/**
 * Soglia in gradi quadrati. 0,1 deg² è circa 35×35 km all'equatore: con il
 * globo disegnato su ~500 px per 180° di latitudine, meno di un pixel.
 */
export const MIN_ISLAND_AREA_DEG2 = 0.1

/** Anello esterno di un poligono: sequenza di coppie [lon, lat]. */
type Ring = number[][]
/** Un poligono: anello esterno seguito dagli eventuali buchi. */
type PolygonRings = Ring[]

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: PolygonRings
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon'
  coordinates: PolygonRings[]
}

export type CountryGeometry = PolygonGeometry | MultiPolygonGeometry

/**
 * Area con la formula dell'area di Gauss, in gradi quadrati.
 * Non è l'area reale sulla sfera — non serve: qui l'unico scopo è ordinare
 * i poligoni per grandezza apparente e tagliare quelli sotto il pixel.
 */
export function ringAreaDeg2(ring: Ring): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j]!
    const b = ring[i]!
    sum += a[0]! * b[1]! - b[0]! * a[1]!
  }
  return Math.abs(sum / 2)
}

export function isCountryGeometry(value: unknown): value is CountryGeometry {
  if (typeof value !== 'object' || value === null) return false
  const geometry = value as { type?: unknown; coordinates?: unknown }
  return (
    (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    Array.isArray(geometry.coordinates)
  )
}

/**
 * Scarta i poligoni sotto la soglia, tenendo sempre il più grande.
 * Il tipo della geometria non cambia mai: un MultiPolygon ridotto a un solo
 * poligono resta un MultiPolygon, così a valle nessuno deve gestire un caso
 * in più.
 */
export function dropTinyIslands(
  geometry: CountryGeometry,
  minArea = MIN_ISLAND_AREA_DEG2,
): CountryGeometry {
  // Un Polygon è già una sola forma: non c'è niente da scartare.
  if (geometry.type === 'Polygon') return geometry

  const polygons = geometry.coordinates
  if (polygons.length <= 1) return geometry

  let largestIndex = 0
  let largestArea = -1
  const areas = polygons.map((polygon, index) => {
    const area = polygon[0] ? ringAreaDeg2(polygon[0]) : 0
    if (area > largestArea) {
      largestArea = area
      largestIndex = index
    }
    return area
  })

  const kept = polygons.filter((_, index) => index === largestIndex || areas[index]! >= minArea)
  if (kept.length === polygons.length) return geometry

  return { type: 'MultiPolygon', coordinates: kept }
}

/** Numero di poligoni distinti: una mesh a testa per three-globe. */
export function countPolygons(geometry: CountryGeometry): number {
  return geometry.type === 'Polygon' ? 1 : geometry.coordinates.length
}
