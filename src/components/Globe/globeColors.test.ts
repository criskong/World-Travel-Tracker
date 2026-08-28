import { describe, expect, it } from 'vitest'
import {
  COLOR_HOVER,
  COLOR_UNRESOLVED,
  COLOR_UNVISITED,
  COLOR_VISITED,
  polygonAltitude,
  polygonCapColor,
} from './globeColors'

const none: ReadonlySet<string> = new Set()

describe('polygonCapColor', () => {
  it('colora di grigio desaturato un Paese non visitato', () => {
    expect(polygonCapColor({ iso: 'IT', visited: none, hoveredIso: null })).toBe(COLOR_UNVISITED)
  })

  it("colora con l'accent color un Paese visitato", () => {
    expect(polygonCapColor({ iso: 'IT', visited: new Set(['IT']), hoveredIso: null })).toBe(
      COLOR_VISITED,
    )
  })

  it("lo stato visitato vince sull'hover: il colore non sparisce al passaggio", () => {
    expect(polygonCapColor({ iso: 'IT', visited: new Set(['IT']), hoveredIso: 'IT' })).toBe(
      COLOR_VISITED,
    )
  })

  it('evidenzia in hover solo i Paesi non visitati', () => {
    expect(polygonCapColor({ iso: 'IT', visited: none, hoveredIso: 'IT' })).toBe(COLOR_HOVER)
    expect(polygonCapColor({ iso: 'IT', visited: none, hoveredIso: 'FR' })).toBe(COLOR_UNVISITED)
  })

  it('usa un colore spento per le feature senza codice ISO', () => {
    expect(polygonCapColor({ iso: null, visited: new Set(['IT']), hoveredIso: null })).toBe(
      COLOR_UNRESOLVED,
    )
  })
})

describe('polygonAltitude', () => {
  it('solleva il poligono solo in hover', () => {
    const base = polygonAltitude({ iso: 'IT', visited: none, hoveredIso: null })
    const hover = polygonAltitude({ iso: 'IT', visited: none, hoveredIso: 'IT' })
    expect(hover).toBeGreaterThan(base)
  })

  it('tiene le feature non risolvibili più basse di tutte', () => {
    const unresolved = polygonAltitude({ iso: null, visited: none, hoveredIso: null })
    const base = polygonAltitude({ iso: 'IT', visited: none, hoveredIso: null })
    expect(unresolved).toBeLessThan(base)
  })
})
