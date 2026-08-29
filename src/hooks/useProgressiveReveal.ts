import { useEffect, useMemo, useState } from 'react'
import { planReveal } from '../data/countries/loadPlan'
import type { CountryPolygon } from '../data/countries/geoData'

export interface ProgressiveReveal {
  /** I Paesi già consegnati al globo. `undefined` finché non c'è il dataset. */
  visible: CountryPolygon[] | undefined
  /** Quanti Paesi sono già sul globo. */
  revealed: number
  /** Quanti saranno in tutto. */
  total: number
  /** Da 0 a 1. */
  progress: number
  complete: boolean
}

/**
 * Consegna i Paesi al globo un gruppo per frame invece che tutti insieme.
 *
 * Il motivo è misurato: three-globe costruisce le mesh in modo sincrono
 * quando riceve `polygonsData`, e sul dataset intero è un blocco unico del
 * thread principale. Un gruppo per frame lascia al browser un paint fra l'uno
 * e l'altro: il globo resta girevole e i Paesi compaiono a ondate, dai
 * continenti agli arcipelaghi.
 *
 * L'ordine e i confini dei gruppi li decide `planReveal`, che è puro; qui
 * resta solo la temporizzazione.
 */
export function useProgressiveReveal(
  polygons: CountryPolygon[] | undefined,
): ProgressiveReveal {
  const plan = useMemo(() => {
    if (!polygons) return null
    const chunks = planReveal(polygons)
    const ordered = chunks.flat()
    // Confine destro di ogni gruppo dentro `ordered`: il numero di Paesi
    // visibili dopo aver rivelato quel gruppo.
    const boundaries: number[] = []
    let sum = 0
    for (const chunk of chunks) {
      sum += chunk.length
      boundaries.push(sum)
    }
    return { ordered, boundaries }
  }, [polygons])

  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (!plan) {
      setRevealed(0)
      return
    }

    let cancelled = false
    let frame = 0
    let next = 0

    // `requestAnimationFrame` e non un timer: garantisce un paint fra un
    // gruppo e l'altro, che è tutto il punto dell'operazione.
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16) as unknown as number
    const unschedule =
      typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : (handle: number) => clearTimeout(handle)

    const step = () => {
      if (cancelled) return
      setRevealed(plan.boundaries[next]!)
      next += 1
      if (next < plan.boundaries.length) frame = schedule(step)
    }

    setRevealed(0)
    frame = schedule(step)

    return () => {
      cancelled = true
      unschedule(frame)
    }
  }, [plan])

  const visible = useMemo(() => {
    if (!plan) return undefined
    // `slice` crea un array nuovo a ogni gruppo: react-kapsule riapplica la
    // prop solo quando cambia l'identità, quindi qui serve davvero.
    return plan.ordered.slice(0, revealed)
  }, [plan, revealed])

  const total = plan?.ordered.length ?? 0
  return {
    visible,
    revealed,
    total,
    progress: total === 0 ? 0 : revealed / total,
    complete: total > 0 && revealed >= total,
  }
}
