// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObjectUrl } from './useObjectUrl'

/**
 * Ogni `createObjectURL` tiene il Blob vivo finché non arriva la revoca.
 * Questi test contano le due chiamate e pretendono che il bilancio torni:
 * è l'unico modo di accorgersi di un leak prima che lo faccia il profiler.
 *
 * jsdom non implementa gli object URL: li sostituiamo con contatori.
 */

const created: string[] = []
const revoked: string[] = []

beforeEach(() => {
  created.length = 0
  revoked.length = 0
  let counter = 0
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${counter++}`
    created.push(url)
    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url)
  })
})

afterEach(() => {
  cleanup()
})

function Preview({ blob }: { blob: Blob | null }) {
  const url = useObjectUrl(blob)
  return <span data-testid="url">{url ?? 'none'}</span>
}

function blobOf(text: string): Blob {
  return new Blob([text], { type: 'image/png' })
}

describe('useObjectUrl', () => {
  it('non crea nulla senza Blob', () => {
    const { getByTestId } = render(<Preview blob={null} />)
    expect(created).toHaveLength(0)
    expect(getByTestId('url').textContent).toBe('none')
  })

  it('crea un URL per il Blob e lo espone', () => {
    const { getByTestId } = render(<Preview blob={blobOf('a')} />)
    expect(created).toHaveLength(1)
    expect(getByTestId('url').textContent).toBe(created[0])
  })

  it('revoca allo smontaggio: nessun URL resta appeso', () => {
    const { unmount } = render(<Preview blob={blobOf('a')} />)
    expect(revoked).toHaveLength(0)

    unmount()

    expect(revoked).toEqual(created)
  })

  it('revoca il vecchio URL quando il Blob cambia', () => {
    const { rerender } = render(<Preview blob={blobOf('a')} />)
    const first = created[0]!

    rerender(<Preview blob={blobOf('b')} />)

    expect(created).toHaveLength(2)
    expect(revoked).toEqual([first])
  })

  it('dopo molti cambi e lo smontaggio il bilancio torna a zero', () => {
    const { rerender, unmount } = render(<Preview blob={blobOf('0')} />)
    for (let index = 1; index < 6; index += 1) {
      rerender(<Preview blob={blobOf(String(index))} />)
    }
    unmount()

    expect(created).toHaveLength(6)
    expect(revoked.sort()).toEqual([...created].sort())
  })

  it('revoca anche quando il Blob torna a null', () => {
    const { rerender } = render(<Preview blob={blobOf('a')} />)
    rerender(<Preview blob={null} />)
    expect(revoked).toEqual(created)
  })
})
