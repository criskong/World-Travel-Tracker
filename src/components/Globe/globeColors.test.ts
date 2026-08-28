import { describe, expect, it } from 'vitest'
import {
  mixColors,
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

describe('mixColors', () => {
  it('agli estremi restituisce i colori di partenza e arrivo', () => {
    expect(mixColors('rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)', 0)).toBe('rgba(0, 0, 0, 1)')
    expect(mixColors('rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)', 1)).toBe(
      'rgba(255, 255, 255, 1)',
    )
  })

  it('a metà strada sta in mezzo, alpha compreso', () => {
    expect(mixColors('rgba(0, 0, 0, 0)', 'rgba(100, 200, 40, 1)', 0.5)).toBe(
      'rgba(50, 100, 20, 0.5)',
    )
  })

  it('accetta anche i colori esadecimali', () => {
    expect(mixColors('#000000', '#ffffff', 0.5)).toBe('rgba(128, 128, 128, 1)')
    expect(mixColors('#000', '#fff', 1)).toBe('rgba(255, 255, 255, 1)')
  })

  it('satura fuori dall intervallo 0-1 invece di sbandare', () => {
    expect(mixColors('rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)', -3)).toBe('rgba(0, 0, 0, 1)')
    expect(mixColors('rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)', 9)).toBe(
      'rgba(255, 255, 255, 1)',
    )
  })
})

describe('polygonCapColor durante una transizione', () => {
  const visited = new Set(['IT'])

  it('senza transizione il colore è netto', () => {
    expect(polygonCapColor({ iso: 'IT', visited, hoveredIso: null })).toBe(COLOR_VISITED)
  })

  it('a inizio transizione parte dal colore precedente', () => {
    expect(polygonCapColor({ iso: 'IT', visited, hoveredIso: null, transition: 0 })).toBe(
      COLOR_UNVISITED,
    )
  })

  it('a fine transizione arriva al colore nuovo', () => {
    expect(polygonCapColor({ iso: 'IT', visited, hoveredIso: null, transition: 1 })).toBe(
      COLOR_VISITED,
    )
  })

  it('a metà non è nessuno dei due', () => {
    const middle = polygonCapColor({ iso: 'IT', visited, hoveredIso: null, transition: 0.5 })
    expect(middle).not.toBe(COLOR_VISITED)
    expect(middle).not.toBe(COLOR_UNVISITED)
    expect(middle).toMatch(/^rgba\(/)
  })

  it('la transizione inversa parte dal colore dei visitati', () => {
    expect(polygonCapColor({ iso: 'IT', visited: none, hoveredIso: null, transition: 0 })).toBe(
      COLOR_VISITED,
    )
    expect(polygonCapColor({ iso: 'IT', visited: none, hoveredIso: null, transition: 1 })).toBe(
      COLOR_UNVISITED,
    )
  })

  it('le feature non risolvibili non transiscono mai', () => {
    expect(polygonCapColor({ iso: null, visited, hoveredIso: null, transition: 0.5 })).toBe(
      COLOR_UNRESOLVED,
    )
  })
})
