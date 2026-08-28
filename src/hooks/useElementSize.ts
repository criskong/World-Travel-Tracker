import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/**
 * Dimensioni correnti di un elemento. Il canvas WebGL ha bisogno di width e
 * height in pixel: non basta il CSS.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      )
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
