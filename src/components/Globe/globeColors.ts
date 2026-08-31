/**
 * Decisione di colore e altitudine di ogni poligono del globo.
 *
 * È logica pura e testabile: il componente si limita a passarla a
 * react-globe.gl. Così "Paese visitato -> accent color" è verificabile
 * senza dover montare un canvas WebGL.
 */

/*
 * Terre calde su oceano blu, non grigio su nero.
 *
 * Il grigio desaturato della prima versione era corretto e inerte: il globo
 * sembrava un diagramma, non un pianeta. La terra ha un colore, e quel colore
 * e caldo; la separazione fra visitato e non visitato passa cosi da un salto
 * di sola luminosita a un salto di TINTA — sabbia contro ciano — che si legge
 * anche in miniatura e anche a chi distingue male i colori.
 */
export const COLOR_UNVISITED = 'rgba(198, 170, 126, 0.82)'
/** Feature senza codice ISO: visibile ma non interattiva. */
export const COLOR_UNRESOLVED = 'rgba(150, 134, 110, 0.3)'
export const COLOR_HOVER = 'rgba(245, 226, 189, 0.95)'
export const COLOR_VISITED = 'rgba(86, 208, 255, 0.94)'

/**
 * Le pareti dell'estrusione: lo spessore della terra, quindi un bruno scuro.
 * Sotto un Paese visitato si accendono.
 */
export const COLOR_SIDE = 'rgba(64, 47, 31, 0.85)'
export const COLOR_SIDE_VISITED = 'rgba(56, 189, 248, 0.5)'
/** I confini: scuri e caldi, per staccare due Paesi vicini senza urlare. */
export const COLOR_STROKE = 'rgba(38, 27, 18, 0.55)'

/** L'oceano. Blu profondo e saturo: e meta della superficie che si vede. */
export const COLOR_GLOBE = '#0b2f57'
/**
 * Sfondo del canvas TRASPARENTE: il cielo stellato lo disegna la CSS dietro
 * al WebGL (`GlobeSky`). Costa zero per frame e non tocca la scena 3D.
 */
export const COLOR_BACKGROUND = 'rgba(0, 0, 0, 0)'

const ALTITUDE_UNRESOLVED = 0.006
const ALTITUDE_BASE = 0.01
/** I Paesi visitati stanno in rilievo: si vedono anche di taglio, sul bordo. */
const ALTITUDE_VISITED = 0.022
const ALTITUDE_HOVER = 0.034

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

export function polygonAltitude({ iso, visited, hoveredIso }: PolygonPaintInput): number {
  if (iso === null) return ALTITUDE_UNRESOLVED
  if (hoveredIso === iso) return ALTITUDE_HOVER
  return visited.has(iso) ? ALTITUDE_VISITED : ALTITUDE_BASE
}

/**
 * Colore delle pareti laterali dell'estrusione.
 *
 * Sotto un Paese visitato sono accese: e quello che fa sembrare il rilievo
 * illuminato da dentro invece che un gradino grigio.
 */
export function polygonSideColor({ iso, visited }: PolygonPaintInput): string {
  if (iso !== null && visited.has(iso)) return COLOR_SIDE_VISITED
  return COLOR_SIDE
}
