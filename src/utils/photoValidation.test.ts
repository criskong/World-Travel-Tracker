import { describe, expect, it } from 'vitest'
import { MAX_PHOTO_BYTES, formatBytes, validatePhoto } from './photoValidation'

describe('validatePhoto', () => {
  it('accetta un JPEG di dimensione ragionevole', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: 800_000 })).toEqual({ ok: true })
  })

  it('rifiuta ciò che non è un immagine', () => {
    const result = validatePhoto({ type: 'application/pdf', size: 1000 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('not an image')
  })

  it('rifiuta i formati immagine non supportati', () => {
    expect(validatePhoto({ type: 'image/tiff', size: 1000 }).ok).toBe(false)
  })

  it('rifiuta una foto oltre il limite, dicendo quanto pesa e qual è il limite', () => {
    const result = validatePhoto({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    // L'utente deve capire il problema senza aprire la console.
    expect(result.error).toContain('5.0 MB')
    expect(result.error).toContain('limit')
  })

  it('accetta esattamente il limite', () => {
    expect(validatePhoto({ type: 'image/png', size: MAX_PHOTO_BYTES }).ok).toBe(true)
  })

  it('rifiuta un file vuoto', () => {
    expect(validatePhoto({ type: 'image/png', size: 0 }).ok).toBe(false)
  })
})

describe('formatBytes', () => {
  it('sceglie una unità leggibile', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
