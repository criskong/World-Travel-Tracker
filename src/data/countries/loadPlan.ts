import { countPolygons, isCountryGeometry, ringAreaDeg2 } from './geometrySimplify'
import type { CountryPolygon } from './geoData'

/**
 * Piano di comparsa dei Paesi sul globo.
 *
 * three-globe costruisce le mesh in modo SINCRONO dentro l'update del layer:
 * passargli tutti i 242 Paesi in una volta significa un blocco unico del
 * thread principale (~750 ms su desktop, molto di più su telefono) in cui la
 * pagina non disegna e non risponde. Spezzando i dati in gruppi e rivelandone
 * uno per frame, lo stesso lavoro totale diventa una sequenza di blocchi
 * corti, con un paint in mezzo: il globo resta girevole e i Paesi compaiono a
 * ondate invece di apparire tutti dopo un'attesa immobile.
 *
 * Questo modulo è puro: decide SOLO l'ordine e i confini dei gruppi.
 */

/**
 * Costo stimato di costruzione di un anello di `n` vertici.
 *
 * Misurato: il costo cresce col quadrato dei vertici (2.805 vertici ~890 ms,
 * 703 ~105 ms, 352 ~37 ms), ma sotto il mezzo migliaio domina la parte
 * lineare. `n + n²/500` riproduce entrambi i regimi. L'unità è arbitraria:
 * serve a confrontare le feature fra loro, non a stimare millisecondi.
 */
function ringCost(vertices: number): number {
  return vertices + (vertices * vertices) / 500
}

export function estimateBuildCost(polygon: CountryPolygon): number {
  const geometry = polygon.feature.geometry
  if (!isCountryGeometry(geometry)) return 0
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.reduce(
    (total, rings) => total + rings.reduce((sum, ring) => sum + ringCost(ring.length), 0),
    0,
  )
}

/** Area apparente della feature: governa l'ordine in cui i Paesi compaiono. */
function visualWeight(polygon: CountryPolygon): number {
  const geometry = polygon.feature.geometry
  if (!isCountryGeometry(geometry)) return 0
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.reduce((total, rings) => total + (rings[0] ? ringAreaDeg2(rings[0]) : 0), 0)
}

/**
 * Costo massimo di un gruppo. Calibrato perché il dataset si divida in una
 * quindicina di gruppi: abbastanza corti da lasciar disegnare il browser fra
 * l'uno e l'altro, abbastanza lunghi da non trasformare il caricamento in
 * centinaia di update del layer.
 */
export const CHUNK_COST_BUDGET = 2600

/**
 * Ordina per area decrescente — i continenti prendono forma subito, gli
 * arcipelaghi si riempiono dopo — e taglia in gruppi entro il budget.
 *
 * Una feature che da sola sfonda il budget non si può spezzare: un anello è
 * indivisibile. Prende un gruppo tutto suo, ma resta al suo posto nell'ordine.
 * Spostare i giganti in coda proteggerebbe la fluidità al prezzo di veder
 * comparire per ultimi Russia, Canada e Stati Uniti: dopo la semplificazione
 * il loro blocco è sceso sotto i 30 ms e non vale quel prezzo.
 */
export function planReveal(
  polygons: readonly CountryPolygon[],
  budget = CHUNK_COST_BUDGET,
): CountryPolygon[][] {
  const ordered = [...polygons].sort((a, b) => visualWeight(b) - visualWeight(a))

  const chunks: CountryPolygon[][] = []
  let current: CountryPolygon[] = []
  let currentCost = 0

  for (const polygon of ordered) {
    const cost = estimateBuildCost(polygon)
    if (current.length > 0 && currentCost + cost > budget) {
      chunks.push(current)
      current = []
      currentCost = 0
    }
    current.push(polygon)
    currentCost += cost
  }
  if (current.length > 0) chunks.push(current)

  return chunks
}

/** Mesh totali del piano: quello che il globo dovrà costruire. */
export function planMeshCount(chunks: readonly (readonly CountryPolygon[])[]): number {
  return chunks.reduce(
    (total, chunk) =>
      total +
      chunk.reduce(
        (sum, polygon) =>
          sum + (isCountryGeometry(polygon.feature.geometry) ? countPolygons(polygon.feature.geometry) : 0),
        0,
      ),
    0,
  )
}
