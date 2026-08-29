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

/**
 * Semplificazione degli anelli (Douglas-Peucker).
 *
 * Seconda misura del profilo: costruire le mesh del 50m costa ~1.600 ms su
 * desktop, in un unico blocco sincrono — ed è LA ragione per cui il globo si
 * pianta al caricamento. Il costo cresce col QUADRATO dei vertici per anello:
 * l'anello principale dell'Antartide, 2.805 vertici, da solo vale ~890 ms,
 * più della metà del mondo intero.
 *
 * Questa è la "via di riserva" già prevista in CLAUDE.md ("Decisioni prese"),
 * applicata però a runtime invece che con mapshaper. L'unica obiezione
 * registrata contro mapshaper era il file derivato da rigenerare a mano: qui
 * non esiste, il dataset resta uno solo e la riduzione è codice con test.
 * La densità che ne esce (45.596 vertici) è quella del mapshaper 40% (41.194).
 */

/**
 * Tolleranza in gradi: nessun punto si sposta di più di ~2,2 km.
 * Il globo disegna ~180° di latitudine su ~500 px, cioè ~40 km per pixel:
 * lo scostamento resta ampiamente sotto il pixel alla vista di default.
 */
export const SIMPLIFY_TOLERANCE_DEG = 0.02

/**
 * Tetto ai vertici di un singolo anello. Serve a limitare il caso peggiore:
 * un anello è indivisibile, quindi il più grande dell'insieme è il blocco
 * più lungo che il thread principale non può spezzare. Sopra il tetto la
 * tolleranza raddoppia finché l'anello non rientra.
 */
export const MAX_RING_VERTICES = 800

/** Distanza al quadrato di `p` dal segmento `a`-`b`, in gradi². */
function squaredDistanceToSegment(p: number[], a: number[], b: number[]): number {
  const ax = a[0]!
  const ay = a[1]!
  const dx = b[0]! - ax
  const dy = b[1]! - ay
  let nx = p[0]! - ax
  let ny = p[1]! - ay

  const lengthSq = dx * dx + dy * dy
  if (lengthSq > 0) {
    let t = (nx * dx + ny * dy) / lengthSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
    nx -= t * dx
    ny -= t * dy
  }
  return nx * nx + ny * ny
}

/**
 * Douglas-Peucker iterativo: la ricorsione andrebbe in stack overflow sugli
 * anelli da migliaia di punti. Restituisce lo stesso anello quando non toglie
 * niente, e anche quando il risultato sarebbe degenere (meno di un triangolo).
 */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  const isClosed =
    ring.length > 1 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
  const points = isClosed ? ring.slice(0, -1) : ring
  // Sotto i 5 punti non c'è margine: toglierne uno degenera il poligono.
  if (points.length < 5 || tolerance <= 0) return ring

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1

  const toleranceSq = tolerance * tolerance
  const stack: number[] = [0, points.length - 1]
  while (stack.length > 0) {
    const end = stack.pop()!
    const start = stack.pop()!

    let farthest = -1
    let farthestDistance = toleranceSq
    for (let i = start + 1; i < end; i += 1) {
      const distance = squaredDistanceToSegment(points[i]!, points[start]!, points[end]!)
      if (distance > farthestDistance) {
        farthestDistance = distance
        farthest = i
      }
    }
    if (farthest > 0) {
      keep[farthest] = 1
      stack.push(start, farthest, farthest, end)
    }
  }

  const simplified: Ring = []
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i] === 1) simplified.push(points[i]!)
  }
  // Un anello ha bisogno di almeno tre punti distinti per avere un'area.
  if (simplified.length < 3) return ring
  if (isClosed) simplified.push(simplified[0]!)
  return simplified.length === ring.length ? ring : simplified
}

/** Semplifica, alzando la tolleranza finché l'anello non rientra nel tetto. */
function simplifyRingCapped(ring: Ring, tolerance: number): Ring {
  let result = simplifyRing(ring, tolerance)
  let current = tolerance
  // Il raddoppio converge in fretta: sei giri coprono un fattore 64.
  for (let attempt = 0; attempt < 6 && result.length > MAX_RING_VERTICES; attempt += 1) {
    current *= 2
    result = simplifyRing(ring, current)
  }
  return result
}

/**
 * Applica la semplificazione a ogni anello, buchi compresi.
 * Come `dropTinyIslands`, restituisce lo stesso oggetto quando non cambia
 * niente: three-globe confronta `coords` per identità.
 */
export function simplifyGeometry(
  geometry: CountryGeometry,
  tolerance = SIMPLIFY_TOLERANCE_DEG,
): CountryGeometry {
  let changedAny = false
  // L'identità va conservata poligono per poligono, non solo sulla geometria:
  // three-globe confronta `coords` di OGNI singolo poligono per riferimento.
  const mapPolygon = (polygon: PolygonRings): PolygonRings => {
    let changed = false
    const rings = polygon.map((ring) => {
      const simplified = simplifyRingCapped(ring, tolerance)
      if (simplified !== ring) changed = true
      return simplified
    })
    if (!changed) return polygon
    changedAny = true
    return rings
  }

  if (geometry.type === 'Polygon') {
    const coordinates = mapPolygon(geometry.coordinates)
    return changedAny ? { type: 'Polygon', coordinates } : geometry
  }

  const coordinates = geometry.coordinates.map(mapPolygon)
  return changedAny ? { type: 'MultiPolygon', coordinates } : geometry
}

/**
 * La riduzione completa applicata al dataset prima di darlo a three-globe:
 * prima si scartano gli isolotti (meno anelli da semplificare), poi si
 * alleggeriscono gli anelli rimasti.
 */
export function reduceGeometry(geometry: CountryGeometry): CountryGeometry {
  return simplifyGeometry(dropTinyIslands(geometry))
}

/** Vertici totali della geometria: la grandezza che governa il costo di build. */
export function countVertices(geometry: CountryGeometry): number {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.reduce(
    (total, polygon) => total + polygon.reduce((sum, ring) => sum + ring.length, 0),
    0,
  )
}
