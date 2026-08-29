// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useProgressiveReveal } from './useProgressiveReveal'
import { CHUNK_COST_BUDGET } from '../data/countries/loadPlan'
import type { CountryPolygon } from '../data/countries/geoData'

afterEach(cleanup)

/** Poligoni finti abbastanza cari da costringere il piano a più gruppi. */
function fakePolygons(count: number): CountryPolygon[] {
  return Array.from({ length: count }, (_, index) => {
    const size = count - index
    const ring = Array.from({ length: 60 }, (_, i) => {
      const angle = (i / 60) * Math.PI * 2
      return [Math.cos(angle) * size, Math.sin(angle) * size]
    })
    ring.push(ring[0]!)
    return {
      id: `c${index}`,
      feature: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
      featureName: `c${index}`,
      iso: `c${index}`,
      country: null,
      expectedUnassigned: false,
    } as unknown as CountryPolygon
  })
}

/** Registra `revealed` a ogni render, per poter guardare la progressione. */
function Probe({ polygons, seen }: { polygons: CountryPolygon[] | undefined; seen: number[] }) {
  const { revealed, total, complete } = useProgressiveReveal(polygons)
  seen.push(revealed)
  return <span data-testid="state">{`${revealed}/${total}${complete ? ' done' : ''}`}</span>
}

describe('useProgressiveReveal', () => {
  it('non consegna niente finché non c è il dataset', () => {
    const seen: number[] = []
    const { getByTestId } = render(<Probe polygons={undefined} seen={seen} />)
    expect(getByTestId('state').textContent).toBe('0/0')
  })

  it('consegna i Paesi a più riprese e arriva in fondo', async () => {
    const seen: number[] = []
    const polygons = fakePolygons(200)
    const { getByTestId } = render(<Probe polygons={polygons} seen={seen} />)

    await waitFor(() => {
      expect(getByTestId('state').textContent).toContain('done')
    })

    expect(getByTestId('state').textContent).toBe('200/200 done')

    // Il punto di tutto l'esercizio: più consegne, non una sola.
    const steps = [...new Set(seen)].sort((a, b) => a - b)
    expect(steps.length).toBeGreaterThan(2)
    expect(steps[0]).toBe(0)
    expect(steps[steps.length - 1]).toBe(200)
  })

  it('cresce sempre, senza tornare indietro', async () => {
    const seen: number[] = []
    const { getByTestId } = render(<Probe polygons={fakePolygons(120)} seen={seen} />)
    await waitFor(() => expect(getByTestId('state').textContent).toContain('done'))

    const progression = seen.filter((value, index) => index === 0 || value !== seen[index - 1])
    for (let i = 1; i < progression.length; i += 1) {
      expect(progression[i]!).toBeGreaterThan(progression[i - 1]!)
    }
  })

  it("dà al globo un array che cresce, nuovo a ogni consegna", async () => {
    const arrays: (readonly CountryPolygon[] | undefined)[] = []
    function Capture({ polygons }: { polygons: CountryPolygon[] }) {
      const { visible, revealed, complete } = useProgressiveReveal(polygons)
      if (arrays[arrays.length - 1] !== visible) arrays.push(visible)
      // È `visible` a finire sul globo: il contatore deve descrivere lui.
      expect(visible?.length ?? 0).toBe(revealed)
      return <span data-testid="state">{complete ? 'done' : 'busy'}</span>
    }
    const { getByTestId } = render(<Capture polygons={fakePolygons(150)} />)
    await waitFor(() => expect(getByTestId('state').textContent).toBe('done'))

    const lengths = arrays.map((array) => array?.length ?? 0)
    // Il globo deve vedere davvero degli insiemi parziali, non solo il totale.
    expect(lengths.filter((length) => length > 0 && length < 150).length).toBeGreaterThan(1)
    for (let i = 1; i < lengths.length; i += 1) {
      expect(lengths[i]!).toBeGreaterThan(lengths[i - 1]!)
    }
    expect(lengths[lengths.length - 1]).toBe(150)
    // react-kapsule riapplica la prop solo se cambia l'identità.
    expect(new Set(arrays).size).toBe(arrays.length)
  })

  it('il budget dei gruppi è quello documentato', () => {
    expect(CHUNK_COST_BUDGET).toBe(2600)
  })
})
