import { useCallback, useEffect, useRef, useState } from 'react'

/** Durata della transizione di colore quando un Paese cambia stato. */
export const VISITED_TRANSITION_MS = 450

/**
 * Il colore dei poligoni non viene animato da three-globe: `material.color.set()`
 * è applicato di colpo, e `polygonsTransitionDuration` interpola solo
 * l'altitudine. Questo hook fornisce l'avanzamento della transizione per i soli
 * Paesi che hanno appena cambiato stato.
 *
 * Costo: zero quando non c'è nulla in corso. Durante una transizione la
 * cadenza è limitata (~20 aggiornamenti al secondo, non uno per frame),
 * perché ogni aggiornamento fa ricalcolare gli accessor a three-globe.
 */
const TICK_INTERVAL_MS = 45

export type TransitionProgress = (iso: string) => number | undefined

export interface VisitedTransitions {
  progressFor: TransitionProgress
  /**
   * Cambia a ogni passo dell'animazione. Va messo fra le dipendenze
   * dell'accessor dei colori: react-kapsule riapplica una prop solo quando
   * cambia identità, quindi senza questo il colore resterebbe fermo al primo
   * fotogramma.
   */
  version: number
}

export function useVisitedTransitions(
  visited: ReadonlySet<string>,
  duration = VISITED_TRANSITION_MS,
): VisitedTransitions {
  const startedAt = useRef(new Map<string, number>())
  const previous = useRef<ReadonlySet<string> | null>(null)
  const [version, setTick] = useState(0)

  useEffect(() => {
    const before = previous.current
    previous.current = visited

    // Al primo render non c'è nulla da animare: i Paesi già visitati devono
    // comparire colorati, non sfumare all'apertura della pagina.
    if (before === null) return

    const now = performance.now()
    for (const iso of visited) {
      if (!before.has(iso)) startedAt.current.set(iso, now)
    }
    for (const iso of before) {
      if (!visited.has(iso)) startedAt.current.set(iso, now)
    }
    if (startedAt.current.size === 0) return

    let frame = 0
    let lastTick = 0

    const step = () => {
      const elapsedNow = performance.now()

      for (const [iso, start] of startedAt.current) {
        if (elapsedNow - start >= duration) startedAt.current.delete(iso)
      }

      if (elapsedNow - lastTick >= TICK_INTERVAL_MS) {
        lastTick = elapsedNow
        setTick((value) => value + 1)
      }

      if (startedAt.current.size > 0) {
        frame = requestAnimationFrame(step)
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [duration, visited])

  const progressFor = useCallback(
    (iso: string) => {
      const start = startedAt.current.get(iso)
      if (start === undefined) return undefined
      const progress = (performance.now() - start) / duration
      return progress >= 1 ? 1 : progress
    },
    [duration],
  )

  return { progressFor, version }
}
