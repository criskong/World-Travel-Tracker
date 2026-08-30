import { describe, expect, it } from 'vitest'
import tailwindConfig from '../../tailwind.config.js'

/**
 * Contrasto della palette.
 *
 * Il tema e scuro e i grigi di Tailwind piu bassi non ce la fanno: misurati
 * contro `base-900`, `slate-500` da 4,23:1 e `slate-600` appena 2,66:1, sotto
 * la soglia WCAG AA di 4,5:1 per il testo normale. Da qui i token `muted` e
 * `subtle`, e da qui questo test: e facile scrivere `text-slate-600` per
 * abitudine e non accorgersi di niente guardando lo schermo di un portatile
 * al buio.
 */

const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, unknown>

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

/** Luminanza relativa secondo WCAG 2.1. */
export function luminance(hex: string): number {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  const r = channel((value >> 16) & 255)
  const g = channel((value >> 8) & 255)
  const b = channel(value & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

/** Il fondo piu chiaro su cui compare del testo: e il caso peggiore. */
const BACKGROUNDS = {
  'base-900': '#05070c',
  'base-800': '#0a0e17',
  'base-700': '#111827',
}

const AA_NORMAL_TEXT = 4.5

describe('il calcolo del contrasto', () => {
  it('e ancorato a valori noti', () => {
    // Bianco su nero e il massimo possibile, 21:1.
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 5)
    // Simmetrico: l'ordine degli argomenti non conta.
    expect(contrastRatio('#38bdf8', '#05070c')).toBeCloseTo(contrastRatio('#05070c', '#38bdf8'), 5)
  })

  it('boccia davvero i grigi che abbiamo scartato', () => {
    expect(contrastRatio('#64748b', '#05070c')).toBeLessThan(AA_NORMAL_TEXT) // slate-500
    expect(contrastRatio('#475569', '#05070c')).toBeLessThan(3) // slate-600
  })
})

describe('i token di testo secondario', () => {
  it('esistono nel tema', () => {
    expect(typeof colors.muted).toBe('string')
    expect(typeof colors.subtle).toBe('string')
  })

  it.each(Object.entries(BACKGROUNDS))(
    'muted e leggibile su %s',
    (_name, background) => {
      expect(contrastRatio(colors.muted as string, background)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      )
    },
  )

  it.each(Object.entries(BACKGROUNDS))(
    'subtle e leggibile su %s',
    (_name, background) => {
      expect(contrastRatio(colors.subtle as string, background)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      )
    },
  )

  it('mantengono la gerarchia: subtle e piu tenue di muted', () => {
    const base = BACKGROUNDS['base-900']
    expect(contrastRatio(colors.subtle as string, base)).toBeLessThan(
      contrastRatio(colors.muted as string, base),
    )
  })
})

describe("l'accent", () => {
  const accent = (colors.accent as { DEFAULT: string }).DEFAULT

  it.each(Object.entries(BACKGROUNDS))('e leggibile su %s', (_name, background) => {
    expect(contrastRatio(accent, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
})
