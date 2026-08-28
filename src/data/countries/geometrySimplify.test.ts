import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MIN_ISLAND_AREA_DEG2,
  countPolygons,
  dropTinyIslands,
  isCountryGeometry,
  ringAreaDeg2,
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
