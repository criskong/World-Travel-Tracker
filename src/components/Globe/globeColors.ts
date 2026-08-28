/**
 * Decisione di colore e altitudine di ogni poligono del globo.
 *
 * È logica pura e testabile: il componente si limita a passarla a
 * react-globe.gl. Così "Paese visitato -> accent color" è verificabile
 * senza dover montare un canvas WebGL.
 */

export const COLOR_UNVISITED = 'rgba(148, 163, 184, 0.32)'
/** Feature senza codice ISO: visibile ma non interattiva. */
export const COLOR_UNRESOLVED = 'rgba(100, 116, 139, 0.16)'
export const COLOR_HOVER = 'rgba(203, 213, 225, 0.55)'
export const COLOR_VISITED = 'rgba(56, 189, 248, 0.85)'
export const COLOR_SIDE = 'rgba(15, 23, 42, 0.65)'
export const COLOR_STROKE = 'rgba(15, 23, 42, 0.9)'
export const COLOR_GLOBE = '#0b1220'
export const COLOR_BACKGROUND = '#05070c'

const ALTITUDE_UNRESOLVED = 0.006
const ALTITUDE_BASE = 0.01
const ALTITUDE_HOVER = 0.028

export interface PolygonPaintInput {
  /** Codice ISO del poligono, `null` se non risolvibile. */
  iso: string | null
  /** Insieme derivato da `manuallyMarked` + `visits`. */
  visited: ReadonlySet<string>
  /** Poligono attualmente sotto il puntatore. */
  hoveredIso: string | null
}

/** Lo stato "visitato" vince sull'hover: il colore non deve sparire al passaggio. */
export function polygonCapColor({ iso, visited, hoveredIso }: PolygonPaintInput): string {
  if (iso === null) return COLOR_UNRESOLVED
  if (visited.has(iso)) return COLOR_VISITED
  if (hoveredIso === iso) return COLOR_HOVER
  return COLOR_UNVISITED
}

export function polygonAltitude({ iso, hoveredIso }: PolygonPaintInput): number {
  if (iso === null) return ALTITUDE_UNRESOLVED
  return hoveredIso === iso ? ALTITUDE_HOVER : ALTITUDE_BASE
}
