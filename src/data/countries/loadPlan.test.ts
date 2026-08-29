import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHUNK_COST_BUDGET, estimateBuildCost, planReveal } from './loadPlan'
import { GEOJSON_FILENAME } from './dataset'
import { isCountryGeometry, reduceGeometry } from './geometrySimplify'
import { featureDisplayName, resolveIso } from './isoResolver'
import type { CountryFeature } from './isoResolver'
import type { CountryPolygon } from './geoData'

/** Un poligono finto con un anello quadrato di lato `size` e `n` vertici. */
function fakePolygon(id: string, size: number, vertices = 5): CountryPolygon {
  const ring = Array.from({ length: vertices - 1 }, (_, i) => {
    const angle = (i / (vertices - 1)) * Math.PI * 2
    return [Math.cos(angle) * size, Math.sin(angle) * size]
  })
  ring.push(ring[0]!)
  return {
    id,
    feature: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
    featureName: id,
    iso: id,
    country: null,
    expectedUnassigned: false,
  } as unknown as CountryPolygon
}

describe('estimateBuildCost', () => {
  it('cresce più che linearmente con i vertici', () => {
    const small = estimateBuildCost(fakePolygon('a', 1, 100))
    const double = estimateBuildCost(fakePolygon('b', 1, 200))
    // Il costo reale è quadratico: raddoppiare i vertici deve costare più del doppio.
    expect(double).toBeGreaterThan(small * 2)
  })

  it('somma tutti gli anelli, buchi compresi', () => {
    const single = fakePolygon('a', 10, 50)
    const withHole = fakePolygon('b', 10, 50)
    const rings = (withHole.feature.geometry as { coordinates: number[][][] }).coordinates
    rings.push(rings[0]!)
    expect(estimateBuildCost(withHole)).toBeCloseTo(estimateBuildCost(single) * 2)
  })

  it('vale zero per una feature senza geometria utilizzabile', () => {
    const broken = { ...fakePolygon('x', 1), feature: { geometry: null } } as unknown as CountryPolygon
    expect(estimateBuildCost(broken)).toBe(0)
  })
})

describe('planReveal', () => {
  const polygons = [
    fakePolygon('piccolo', 1),
    fakePolygon('grande', 100),
    fakePolygon('medio', 10),
  ]

  it('non perde né duplica nessuna feature', () => {
    const revealed = planReveal(polygons, 10_000).flat()
    expect(revealed).toHaveLength(polygons.length)
    expect(new Set(revealed.map((p) => p.id))).toEqual(new Set(polygons.map((p) => p.id)))
  })

  it('mette per primi i Paesi più grandi', () => {
    expect(planReveal(polygons, 10_000).flat().map((p) => p.id)).toEqual([
      'grande',
      'medio',
      'piccolo',
    ])
  })

  it('tiene i gruppi da più feature entro il budget', () => {
    const many = Array.from({ length: 20 }, (_, i) => fakePolygon(`p${i}`, 20 - i, 40))
    const budget = estimateBuildCost(many[0]!) * 3
    for (const chunk of planReveal(many, budget)) {
      const cost = chunk.reduce((total, p) => total + estimateBuildCost(p), 0)
      if (chunk.length > 1) expect(cost).toBeLessThanOrEqual(budget)
    }
  })

  it('isola in un gruppo suo la feature che da sola sfonda il budget', () => {
    // Un anello è indivisibile: l'unica cosa che il piano può fare è non
    // metterci nient'altro insieme.
    const huge = fakePolygon('enorme', 5, 400)
    const chunks = planReveal([huge, ...polygons], 500)
    const itsChunk = chunks.find((chunk) => chunk.some((p) => p.id === 'enorme'))
    expect(itsChunk).toHaveLength(1)
  })

  it('non spezza niente quando il budget è enorme', () => {
    expect(planReveal(polygons, Number.MAX_SAFE_INTEGER)).toHaveLength(1)
  })

  it("non tocca l'array che riceve", () => {
    const input = [...polygons]
    planReveal(input, 10)
    expect(input.map((p) => p.id)).toEqual(polygons.map((p) => p.id))
  })
})

describe('il piano sul dataset reale', () => {
  const features = (
    JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8')) as {
      features: CountryFeature[]
    }
  ).features

  const polygons: CountryPolygon[] = features.map((feature, index) => {
    const { code, expectedUnassigned } = resolveIso(feature)
    const geometry = isCountryGeometry(feature.geometry)
      ? reduceGeometry(feature.geometry)
      : feature.geometry
    return {
      id: code ?? `unresolved:${index}`,
      feature: { ...feature, geometry },
      featureName: featureDisplayName(feature),
      iso: code,
      country: null,
      expectedUnassigned,
    }
  })

  const chunks = planReveal(polygons)

  it('consegna tutte le 242 feature', () => {
    expect(chunks.flat()).toHaveLength(features.length)
  })

  /**
   * Un gruppo per frame: pochi gruppi e il blocco torna lungo, troppi e il
   * caricamento diventa una processione di update del layer.
   */
  it('si divide in una manciata di gruppi', () => {
    expect(chunks.length).toBeGreaterThan(10)
    expect(chunks.length).toBeLessThan(50)
  })

  it('i primi gruppi sono i continenti, gli ultimi gli arcipelaghi', () => {
    const first = chunks[0]!.map((p) => p.featureName)
    const last = chunks[chunks.length - 1]!.map((p) => p.featureName)
    expect(first).toContain('Antarctica')
    expect(last).toContain('Vatican')
    // L'ultimo gruppo è fatto di micro-Stati: tanti, e tutti minuscoli.
    expect(last.length).toBeGreaterThan(chunks[0]!.length)
  })

  it('il gruppo più caro resta vicino al budget', () => {
    const costs = chunks.map((chunk) =>
      chunk.reduce((total, p) => total + estimateBuildCost(p), 0),
    )
    // Le feature indivisibili possono sforare, ma non di un ordine di grandezza.
    expect(Math.max(...costs)).toBeLessThan(CHUNK_COST_BUDGET * 4)
  })
})
