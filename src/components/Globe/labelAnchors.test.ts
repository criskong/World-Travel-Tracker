import { describe, expect, it } from 'vitest'
import {
  buildLabelAnchors,
  labelSizeDeg,
  labelText,
  quantizeAltitude,
  selectLabels,
} from './labelAnchors'
import type { CountryPolygon } from '../../data/countries/geoData'

/** Un poligono finto con un solo anello rettangolare. */
function box(iso: string, west: number, south: number, east: number, north: number): CountryPolygon {
  const ring = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]
  return {
    id: iso,
    iso,
    country: null,
    featureName: iso,
    expectedUnassigned: false,
    feature: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
  } as unknown as CountryPolygon
}

describe('buildLabelAnchors', () => {
  it('mette il nome al centro del Paese', () => {
    const [anchor] = buildLabelAnchors([box('IT', 7, 37, 18, 47)])
    expect(anchor?.lat).toBeCloseTo(42, 5)
    expect(anchor?.lng).toBeCloseTo(12.5, 5)
  })

  it('con piu feature dello stesso Paese sceglie la piu grande', () => {
    const mainland = box('FR', -5, 42, 8, 51)
    const guiana = { ...box('FR', -54, 2, -51, 6), id: 'FR-guiana' }
    const [anchor] = buildLabelAnchors([guiana, mainland])
    expect(anchor?.lat).toBeCloseTo(46.5, 5)
  })

  it('ignora le feature senza codice ISO', () => {
    const anchors = buildLabelAnchors([{ ...box('XX', 0, 0, 10, 10), iso: null } as CountryPolygon])
    expect(anchors).toEqual([])
  })

  it('un anello che scavalca l’antimeridiano non diventa largo 360 gradi', () => {
    const ring = [
      [177, -19],
      [180, -19],
      [-178, -19],
      [-178, -16],
      [180, -16],
      [177, -16],
      [177, -19],
    ]
    const fiji = {
      ...box('FJ', 0, 0, 1, 1),
      feature: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
    } as unknown as CountryPolygon
    const [anchor] = buildLabelAnchors([fiji])
    expect(anchor!.spanDeg).toBeLessThan(10)
    expect(Math.abs(anchor!.lng)).toBeGreaterThan(170)
  })

  it('la larghezza tiene conto della latitudine: stessi gradi, meno spazio al nord', () => {
    const [equator] = buildLabelAnchors([box('EQ', 0, -5, 20, 5)])
    const [north] = buildLabelAnchors([box('NO', 0, 60, 20, 70)])
    expect(north!.spanDeg).toBeLessThan(equator!.spanDeg / 1.5)
  })
})

describe('labelSizeDeg', () => {
  it('a vista piu lontana il testo deve essere piu grande in gradi per restare leggibile', () => {
    expect(labelSizeDeg(2.5, 500)).toBeGreaterThan(labelSizeDeg(0.5, 500))
  })

  it('alla vista di default su 500 px il testo e di qualche grado', () => {
    const size = labelSizeDeg(2.5, 500)
    expect(size).toBeGreaterThan(2)
    expect(size).toBeLessThan(4)
  })

  it('senza viewport non c’e testo', () => {
    expect(labelSizeDeg(2.5, 0)).toBe(0)
  })
})

describe('quantizeAltitude', () => {
  it('e idempotente e a passi: due zoom vicini danno la stessa misura', () => {
    const a = quantizeAltitude(2.5)
    expect(quantizeAltitude(a)).toBe(a)
    expect(quantizeAltitude(2.6)).toBe(a)
    expect(quantizeAltitude(1.2)).not.toBe(a)
  })
})

describe('labelText', () => {
  it('toglie gli accenti che la font non ha', () => {
    expect(labelText('Perù')).toBe('Peru')
    expect(labelText('Città del Vaticano')).toBe('Citta del Vaticano')
    expect(labelText('Isole Fær Øer')).toBe('Isole Faer Oer')
    expect(labelText('Côte d’Ivoire')).toBe("Cote d'Ivoire")
  })

  it('lascia in pace un nome gia semplice', () => {
    expect(labelText('Brazil')).toBe('Brazil')
  })
})

describe('selectLabels', () => {
  const anchors = buildLabelAnchors([box('RU', 30, 50, 180, 75), box('MC', 7.4, 43.7, 7.45, 43.75)])
  const names: Record<string, string> = { RU: 'Russia', MC: 'Monaco' }

  it('scrive solo i nomi che stanno dentro il proprio Paese', () => {
    const labels = selectLabels(anchors, (iso) => names[iso]!, 3)
    expect(labels.map((label) => label.iso)).toEqual(['RU'])
    expect(labels[0]?.text).toBe('Russia')
  })

  it('avvicinandosi il testo si stringe in gradi e ci stanno piu nomi', () => {
    const far = selectLabels(anchors, (iso) => names[iso]!, 3)
    const near = selectLabels(anchors, (iso) => names[iso]!, 0.005)
    expect(near.length).toBeGreaterThan(far.length)
  })

  it('con misura zero non scrive niente', () => {
    expect(selectLabels(anchors, (iso) => names[iso]!, 0)).toEqual([])
  })
})
