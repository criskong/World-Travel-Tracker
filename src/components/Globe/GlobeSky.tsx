import { memo } from 'react'

/**
 * Il cielo dietro al globo: un campo stellato e un alone.
 *
 * Sta in CSS/SVG, non nella scena 3D. Un backgroundImageUrl vorrebbe dire una
 * texture da scaricare (vincolo: nessuna rete a runtime) o da committare, e
 * uno starfield di particelle three.js costerebbe draw call a ogni frame.
 * Qui e markup statico: il browser lo dipinge una volta e non ci torna piu.
 */

/** PRNG deterministico: le stelle devono stare sempre nello stesso posto. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Star {
  cx: number
  cy: number
  r: number
  opacity: number
}

/**
 * Calcolate una volta sola all'import, non a ogni render: sono 160 numeri che
 * non cambiano mai.
 */
const STARS: Star[] = (() => {
  const random = mulberry32(20260831)
  return Array.from({ length: 160 }, () => {
    // Poche stelle grandi e molte piccole: la distribuzione uniforme sembra
    // rumore, quella al cubo sembra un cielo.
    const size = random() ** 3
    return {
      cx: Number((random() * 100).toFixed(2)),
      cy: Number((random() * 100).toFixed(2)),
      r: Number((0.05 + size * 0.16).toFixed(3)),
      opacity: Number((0.25 + size * 0.6).toFixed(2)),
    }
  })
})()

function GlobeSkyComponent() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-base-900">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {STARS.map((star) => (
          <circle
            key={`${star.cx}-${star.cy}`}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#e2e8f0"
            opacity={star.opacity}
          />
        ))}
      </svg>

      {/* Alone: il globo sembra illuminato da qualcosa, non incollato sul nero. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,0.14),rgba(12,20,38,0.35)_38%,transparent_68%)]" />
    </div>
  )
}

export const GlobeSky = memo(GlobeSkyComponent)
