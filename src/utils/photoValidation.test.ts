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
    expect(result.error.key).toBe('photo.notImage')
  })

  /**
   * Un `image/*` sconosciuto NON si rifiuta qui: l'iPhone scatta in HEIC, e
   * decidere per lista significava dirgli di no. A rifiutare ci pensa il
   * browser in decodifica (`photoProcessing.ts`), se davvero non lo legge.
   */
  it('lascia passare un formato immagine sconosciuto, che verra decodificato dal browser', () => {
    expect(validatePhoto({ type: 'image/heic', size: 1000 }).ok).toBe(true)
    expect(validatePhoto({ type: 'image/tiff', size: 1000 }).ok).toBe(true)
  })

  it('rifiuta una foto oltre il limite, dicendo quanto pesa e qual è il limite', () => {
    const result = validatePhoto({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    // L'utente deve capire il problema senza aprire la console: il messaggio
    // porta con se la dimensione vera e il limite, e la frase la compone la
    // traduzione.
    expect(result.error.key).toBe('photo.tooLarge')
    expect(result.error.vars).toEqual({ size: '25.0 MB', limit: '25.0 MB' })
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
