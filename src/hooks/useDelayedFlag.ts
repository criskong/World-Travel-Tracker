import { useEffect, useState } from 'react'

/**
 * `true` solo dopo che `active` è rimasto vero ininterrottamente per
 * `delayMs`. Serve a non far lampeggiare un indicatore di attesa quando
 * l'attesa non c'è: con il dataset già in cache il caricamento finisce in
 * pochi millisecondi, e un pannello che appare e sparisce nello stesso
 * respiro si nota più di uno che non appare affatto.
 */
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) {
      setShown(false)
      return
    }
    const timer = setTimeout(() => setShown(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return shown && active
}
