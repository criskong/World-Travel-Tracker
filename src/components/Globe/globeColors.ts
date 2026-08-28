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
  /**
   * Avanzamento della transizione da/verso "visitato", da 0 a 1.
   * `undefined` quando non c'è nessuna transizione in corso: è il caso
   * normale, e costa zero.
   */
  transition?: number
}

type Rgba = [number, number, number, number]

/** Accetta `rgb()`, `rgba()` e `#rgb`/`#rrggbb`. */
function parseColor(color: string): Rgba {
  const functional = /^rgba?\(([^)]+)\)$/i.exec(color.trim())
  if (functional) {
    const parts = functional[1]!.split(',').map((piece) => Number(piece.trim()))
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1]
  }

  const hex = color.trim().replace('#', '')
  const expanded = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex
  return [
    Number.parseInt(expanded.slice(0, 2), 16) || 0,
    Number.parseInt(expanded.slice(2, 4), 16) || 0,
    Number.parseInt(expanded.slice(4, 6), 16) || 0,
    1,
  ]
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** Interpolazione lineare fra due colori, canale alpha compreso. */
export function mixColors(from: string, to: string, amount: number): string {
  const t = clamp01(amount)
  const a = parseColor(from)
  const b = parseColor(to)
  const channel = (index: number) => Math.round(a[index]! + (b[index]! - a[index]!) * t)
  const alpha = Number((a[3]! + (b[3]! - a[3]!) * t).toFixed(3))
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`
}

/** Il colore a riposo di un poligono, senza transizioni. */
function restingColor(iso: string, visited: ReadonlySet<string>, hoveredIso: string | null): string {
  if (visited.has(iso)) return COLOR_VISITED
  if (hoveredIso === iso) return COLOR_HOVER
  return COLOR_UNVISITED
}

/**
 * Lo stato "visitato" vince sull'hover: il colore non deve sparire al passaggio.
 * Con `transition` in corso il colore parte da quello dello stato precedente e
 * arriva a quello attuale, così marcare un Paese non è uno scatto secco.
 */
export function polygonCapColor({
  iso,
  visited,
  hoveredIso,
  transition,
}: PolygonPaintInput): string {
  if (iso === null) return COLOR_UNRESOLVED

  const target = restingColor(iso, visited, hoveredIso)
  if (transition === undefined || transition >= 1) return target

  // Da dove sta arrivando: se ora è visitato veniva dal grigio, e viceversa.
  const origin = visited.has(iso)
    ? hoveredIso === iso
      ? COLOR_HOVER
      : COLOR_UNVISITED
    : COLOR_VISITED

  return mixColors(origin, target, transition)
}

export function polygonAltitude({ iso, hoveredIso }: PolygonPaintInput): number {
  if (iso === null) return ALTITUDE_UNRESOLVED
  return hoveredIso === iso ? ALTITUDE_HOVER : ALTITUDE_BASE
}
