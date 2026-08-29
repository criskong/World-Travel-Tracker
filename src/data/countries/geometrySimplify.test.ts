import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MAX_RING_VERTICES,
  MIN_ISLAND_AREA_DEG2,
  SIMPLIFY_TOLERANCE_DEG,
  countPolygons,
  countVertices,
  dropTinyIslands,
  isCountryGeometry,
  reduceGeometry,
  ringAreaDeg2,
  simplifyGeometry,
  simplifyRing,
} from './geometrySimplify'
import type { CountryGeometry } from './geometrySimplify'
import { GEOJSON_FILENAME } from './dataset'
import { UN_MEMBER_CODES } from './countries'
import { resolveIsoA2 } from './isoResolver'
import type { CountryFeature } from './isoResolver'

/** Quadrato di lato `size` con angolo in basso a sinistra all'origine. */
function square(size: number, offset = 0): number[][] {
  return [
    [offset, offset],
    [offset + size, offset],
    [offset + size, offset + size],
    [offset, offset + size],
    [offset, offset],
  ]
}

describe('ringAreaDeg2', () => {
  it("calcola l'area di un quadrato", () => {
    expect(ringAreaDeg2(square(2))).toBeCloseTo(4)
    expect(ringAreaDeg2(square(0.1))).toBeCloseTo(0.01)
  })

  it('non dipende dal verso di percorrenza', () => {
    const clockwise = [...square(3)].reverse()
    expect(ringAreaDeg2(clockwise)).toBeCloseTo(9)
  })
})

describe('dropTinyIslands', () => {
  it('lascia intatto un Polygon: non c è niente da scartare', () => {
    const geometry: CountryGeometry = { type: 'Polygon', coordinates: [square(0.001)] }
    expect(dropTinyIslands(geometry)).toBe(geometry)
  })

  it('lascia intatto un MultiPolygon con una sola forma', () => {
    const geometry: CountryGeometry = { type: 'MultiPolygon', coordinates: [[square(0.001)]] }
    expect(dropTinyIslands(geometry)).toBe(geometry)
  })

  it('scarta le forme sotto la soglia', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(10)], [square(0.01, 50)], [square(0.01, 60)]],
    }
    const reduced = dropTinyIslands(geometry, 1)
    expect(countPolygons(reduced)).toBe(1)
    expect(reduced.coordinates[0]).toEqual([square(10)])
  })

  it('tiene le forme sopra la soglia', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(10)], [square(5)], [square(0.01, 60)]],
    }
    expect(countPolygons(dropTinyIslands(geometry, 1))).toBe(2)
  })

  /** La regola che impedisce a un Paese di sparire dal globo. */
  it('tiene SEMPRE la forma più grande, anche se è sotto la soglia', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(0.002, 10)], [square(0.001, 20)]],
    }
    const reduced = dropTinyIslands(geometry, 1)
    expect(countPolygons(reduced)).toBe(1)
    // La più grande delle due, non la prima dell'elenco.
    expect(reduced.coordinates[0]).toEqual([square(0.002, 10)])
  })

  it('la forma più grande vince anche se non è la prima', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(0.001)], [square(0.5, 30)], [square(0.001, 40)]],
    }
    const reduced = dropTinyIslands(geometry, 100)
    expect(reduced.coordinates).toEqual([[square(0.5, 30)]])
  })

  it('non cambia il tipo: un MultiPolygon ridotto a uno resta MultiPolygon', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(10)], [square(0.001, 50)]],
    }
    expect(dropTinyIslands(geometry, 1).type).toBe('MultiPolygon')
  })

  it('restituisce lo stesso oggetto quando non scarta nulla', () => {
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(10)], [square(9)]],
    }
    // L'identità conta: three-globe confronta `coords` per riferimento e
    // ricostruirebbe la mesh se cambiasse a ogni update.
    expect(dropTinyIslands(geometry, 1)).toBe(geometry)
  })

  it('conserva i buchi della forma che tiene', () => {
    const withHole: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[square(10), square(2, 3)], [square(0.001, 50)]],
    }
    const reduced = dropTinyIslands(withHole, 1)
    expect(reduced.coordinates[0]).toHaveLength(2)
  })
})

describe('effetto sul dataset reale', () => {
  const features = (
    JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8')) as {
      features: CountryFeature[]
    }
  ).features

  const before = features.map((feature) => feature.geometry).filter(isCountryGeometry)
  const after = before.map((geometry) => dropTinyIslands(geometry))

  const meshesBefore = before.reduce((total, geometry) => total + countPolygons(geometry), 0)
  const meshesAfter = after.reduce((total, geometry) => total + countPolygons(geometry), 0)

  it('taglia le mesh di almeno la metà', () => {
    expect(meshesBefore).toBe(1620)
    expect(meshesAfter).toBe(610)
    expect(meshesAfter).toBeLessThan(meshesBefore / 2)
  })

  it('non perde nessuna feature', () => {
    expect(after).toHaveLength(before.length)
    expect(after.every((geometry) => countPolygons(geometry) >= 1)).toBe(true)
  })

  /**
   * Il controllo che conta: siamo passati al 50m proprio per avere i
   * micro-Stati sul globo. Se il filtro ne facesse sparire uno avrebbe
   * annullato il motivo del cambio di dataset.
   */
  it('ogni Stato ONU conserva la sua geometria', () => {
    const withGeometry = new Set(
      features
        .filter((feature) => {
          if (!isCountryGeometry(feature.geometry)) return false
          return countPolygons(dropTinyIslands(feature.geometry)) >= 1
        })
        .map((feature) => resolveIsoA2(feature))
        .filter((code): code is string => code !== null),
    )

    const missing = [...UN_MEMBER_CODES].filter((code) => !withGeometry.has(code))
    expect(missing).toEqual([])
  })

  it('conserva la maggior parte dei vertici: si perdono solo isolotti', () => {
    const countVertices = (list: CountryGeometry[]) =>
      list.reduce((total, geometry) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
        return (
          total +
          polygons.reduce(
            (sum, polygon) => sum + polygon.reduce((count, ring) => count + ring.length, 0),
            0,
          )
        )
      }, 0)

    const kept = countVertices(after) / countVertices(before)
    expect(kept).toBeGreaterThan(0.85)
  })

  it('la soglia è quella documentata', () => {
    expect(MIN_ISLAND_AREA_DEG2).toBe(0.1)
  })
})

describe('simplifyRing', () => {
  /** Anello chiuso con un punto in mezzo a un lato, quindi ridondante. */
  const withCollinearPoint = [
    [0, 0],
    [5, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ]

  it('toglie i punti che non cambiano la forma', () => {
    const simplified = simplifyRing(withCollinearPoint, 0.01)
    expect(simplified).toHaveLength(5)
    expect(simplified).not.toContainEqual([5, 0])
  })

  it('tiene i punti che sporgono più della tolleranza', () => {
    const withBump = [
      [0, 0],
      [5, 1],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]
    expect(simplifyRing(withBump, 0.5)).toContainEqual([5, 1])
    expect(simplifyRing(withBump, 2)).not.toContainEqual([5, 1])
  })

  it('resta un anello chiuso', () => {
    const simplified = simplifyRing(withCollinearPoint, 0.01)
    expect(simplified[0]).toEqual(simplified[simplified.length - 1])
  })

  it('restituisce lo stesso anello quando non toglie niente', () => {
    // L'identità conta: è ciò che evita a three-globe di ricostruire la mesh.
    // L'esagono serve a passare DAVVERO per Douglas-Peucker: sotto i cinque
    // punti la funzione esce subito e non proverebbe niente.
    const hexagon = Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2
      return [Math.cos(angle) * 10, Math.sin(angle) * 10]
    })
    hexagon.push(hexagon[0]!)
    expect(simplifyRing(hexagon, 0.001)).toBe(hexagon)
    expect(simplifyRing(withCollinearPoint, 0)).toBe(withCollinearPoint)
  })

  it('non degenera un anello sotto il triangolo, per quanto alta sia la tolleranza', () => {
    const simplified = simplifyRing(withCollinearPoint, 1000)
    expect(simplified.length).toBeGreaterThanOrEqual(4)
    expect(ringAreaDeg2(simplified)).toBeGreaterThan(0)
  })

  it('lascia stare gli anelli già minimi', () => {
    const triangle = [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 0],
    ]
    expect(simplifyRing(triangle, 10)).toBe(triangle)
  })

  it('regge un anello da migliaia di punti senza andare in stack overflow', () => {
    const circle = Array.from({ length: 5000 }, (_, i) => {
      const a = (i / 5000) * Math.PI * 2
      return [Math.cos(a) * 10, Math.sin(a) * 10]
    })
    circle.push(circle[0]!)
    expect(simplifyRing(circle, 0.05).length).toBeLessThan(circle.length)
  })
})

describe('simplifyGeometry', () => {
  it('semplifica anche i buchi', () => {
    const withHole: CountryGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [5, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [2, 2],
          [4, 2],
          [6, 2],
          [6, 6],
          [2, 6],
          [2, 2],
        ],
      ],
    }
    const simplified = simplifyGeometry(withHole, 0.01)
    expect(simplified.coordinates).toHaveLength(2)
    expect((simplified.coordinates as number[][][])[1]).toHaveLength(5)
  })

  it('restituisce lo stesso oggetto quando non cambia niente', () => {
    const geometry: CountryGeometry = { type: 'Polygon', coordinates: [square(10)] }
    expect(simplifyGeometry(geometry, 0.01)).toBe(geometry)
  })

  it('conserva il riferimento dei singoli poligoni che non cambiano', () => {
    const untouched = square(10)
    const geometry: CountryGeometry = {
      type: 'MultiPolygon',
      coordinates: [[untouched], [[[0, 0], [5, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]],
    }
    const simplified = simplifyGeometry(geometry, 0.01)
    // three-globe confronta `coords` di OGNI poligono per riferimento.
    expect(simplified.coordinates[0]).toBe(geometry.coordinates[0])
    expect(simplified.coordinates[1]).not.toBe(geometry.coordinates[1])
  })
})

describe('reduceGeometry sul dataset reale', () => {
  const features = (
    JSON.parse(readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8')) as {
      features: CountryFeature[]
    }
  ).features

  const original = features.map((feature) => feature.geometry).filter(isCountryGeometry)
  const reduced = original.map((geometry) => reduceGeometry(geometry))

  const vertices = (list: CountryGeometry[]) =>
    list.reduce((total, geometry) => total + countVertices(geometry), 0)

  const largestRing = (list: CountryGeometry[]) =>
    list.reduce((max, geometry) => {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
      return polygons.reduce((m, rings) => rings.reduce((mm, ring) => Math.max(mm, ring.length), m), max)
    }, 0)

  /**
   * Il numero che conta: costruire le mesh costa il QUADRATO dei vertici per
   * anello, quindi è il caso peggiore a determinare il blocco più lungo che
   * il thread principale non può spezzare.
   */
  it('nessun anello supera il tetto', () => {
    expect(largestRing(original)).toBeGreaterThan(MAX_RING_VERTICES)
    expect(largestRing(reduced)).toBeLessThanOrEqual(MAX_RING_VERTICES)
  })

  it('dimezza abbondantemente i vertici', () => {
    expect(vertices(original)).toBe(99613)
    expect(vertices(reduced)).toBeLessThan(vertices(original) / 2)
  })

  /**
   * La garanzia che non si può perdere: siamo passati al 50m per avere i
   * micro-Stati. Nessuna riduzione può farne sparire uno.
   */
  it('ogni Stato ONU conserva la sua geometria', () => {
    const withGeometry = new Set(
      features
        .filter((feature) => {
          if (!isCountryGeometry(feature.geometry)) return false
          const geometry = reduceGeometry(feature.geometry)
          return countPolygons(geometry) >= 1 && countVertices(geometry) >= 4
        })
        .map((feature) => resolveIsoA2(feature))
        .filter((code): code is string => code !== null),
    )

    expect([...UN_MEMBER_CODES].filter((code) => !withGeometry.has(code))).toEqual([])
  })

  it('ogni anello resta un poligono valido', () => {
    for (const geometry of reduced) {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
      for (const rings of polygons) {
        for (const ring of rings) {
          expect(ring.length).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring[ring.length - 1])
        }
      }
    }
  })

  it('la tolleranza è quella documentata', () => {
    expect(SIMPLIFY_TOLERANCE_DEG).toBe(0.02)
    expect(MAX_RING_VERTICES).toBe(800)
  })
})
