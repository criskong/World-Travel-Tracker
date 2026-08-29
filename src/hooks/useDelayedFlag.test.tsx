// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedFlag } from './useDelayedFlag'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Probe({ active, delayMs }: { active: boolean; delayMs?: number }) {
  const shown = useDelayedFlag(active, delayMs)
  return <span data-testid="flag">{shown ? 'shown' : 'hidden'}</span>
}

function flag(container: HTMLElement): string {
  return container.querySelector('[data-testid="flag"]')?.textContent ?? ''
}

describe('useDelayedFlag', () => {
  it('non si accende subito', () => {
    const { container } = render(<Probe active />)
    expect(flag(container)).toBe('hidden')
  })

  it('si accende dopo il ritardo', () => {
    const { container } = render(<Probe active delayMs={200} />)

    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(flag(container)).toBe('hidden')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(flag(container)).toBe('shown')
  })

  /** Il caso che conta: con il dataset in cache l'attesa finisce subito. */
  it("non si accende mai se l'attesa finisce prima del ritardo", () => {
    const { container, rerender } = render(<Probe active delayMs={200} />)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender(<Probe active={false} delayMs={200} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(flag(container)).toBe('hidden')
  })

  it('si spegne appena l attesa finisce', () => {
    const { container, rerender } = render(<Probe active delayMs={200} />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(flag(container)).toBe('shown')

    rerender(<Probe active={false} delayMs={200} />)
    expect(flag(container)).toBe('hidden')
  })

  it('con active falso resta spento', () => {
    const { container } = render(<Probe active={false} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(flag(container)).toBe('hidden')
  })

  it('riparte da capo se l attesa ricomincia', () => {
    const { container, rerender } = render(<Probe active delayMs={200} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    rerender(<Probe active={false} delayMs={200} />)
    rerender(<Probe active delayMs={200} />)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    // Se il timer non fosse ripartito, i 150 + 150 avrebbero gia acceso.
    expect(flag(container)).toBe('hidden')

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(flag(container)).toBe('shown')
  })
})
