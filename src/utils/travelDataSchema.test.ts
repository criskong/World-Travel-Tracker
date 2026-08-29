import { describe, expect, it } from 'vitest'
import { isValidVisitDate, parseTravelData, parseTravelDataJson } from './travelDataSchema'

describe('isValidVisitDate', () => {
  it('accetta una data reale in formato AAAA-MM-GG', () => {
    expect(isValidVisitDate('2024-05-01')).toBe(true)
  })

  it('rifiuta formati diversi e date inesistenti', () => {
    expect(isValidVisitDate('01/05/2024')).toBe(false)
    expect(isValidVisitDate('2024-5-1')).toBe(false)
    expect(isValidVisitDate('2024-02-31')).toBe(false)
    expect(isValidVisitDate('2024-13-01')).toBe(false)
    expect(isValidVisitDate(20240501)).toBe(false)
    expect(isValidVisitDate(null)).toBe(false)
  })
})

describe('parseTravelData', () => {
  it('accetta un payload valido e normalizza i codici', () => {
    const result = parseTravelData({
      manuallyMarked: ['it', 'FR'],
      visits: [{ id: 'v1', countryCode: 'jp', date: '2024-05-01' }],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.manuallyMarked).toEqual(['FR', 'IT'])
    expect(result.data.visits[0]).toEqual({ id: 'v1', countryCode: 'JP', date: '2024-05-01' })
    expect(result.warnings).toEqual([])
  })

  it('rifiuta input che non sono oggetti', () => {
    for (const input of [null, undefined, 42, 'testo', [1, 2]]) {
      const result = parseTravelData(input)
      expect(result.ok).toBe(false)
    }
  })

  it('rifiuta un payload senza i campi obbligatori', () => {
    const result = parseTravelData({ visits: [] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(' ')).toContain('manuallyMarked')
  })

  it('rifiuta un file di una versione di formato futura', () => {
    const result = parseTravelData({ formatVersion: 99, manuallyMarked: [], visits: [] })
    expect(result.ok).toBe(false)
  })

  it('scarta i codici Paese sconosciuti segnalandolo', () => {
    const result = parseTravelData({ manuallyMarked: ['IT', 'ZZ', 42], visits: [] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.manuallyMarked).toEqual(['IT'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('2')
  })

  it('rimuove i duplicati in manuallyMarked', () => {
    const result = parseTravelData({ manuallyMarked: ['IT', 'it', 'IT'], visits: [] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.manuallyMarked).toEqual(['IT'])
  })

  it('scarta i viaggi con id, Paese o data non validi', () => {
    const result = parseTravelData({
      manuallyMarked: [],
      visits: [
        { id: 'ok', countryCode: 'JP', date: '2024-05-01' },
        { id: '', countryCode: 'JP', date: '2024-05-01' },
        { id: 'x', countryCode: 'ZZ', date: '2024-05-01' },
        { id: 'y', countryCode: 'JP', date: '2024-02-31' },
        'non un oggetto',
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.visits.map((visit) => visit.id)).toEqual(['ok'])
    expect(result.warnings.join(' ')).toContain('4')
  })

  it('scarta i viaggi con id duplicato', () => {
    const result = parseTravelData({
      manuallyMarked: [],
      visits: [
        { id: 'v1', countryCode: 'JP', date: '2024-05-01' },
        { id: 'v1', countryCode: 'FR', date: '2024-06-01' },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.visits).toHaveLength(1)
    expect(result.data.visits[0]!.countryCode).toBe('JP')
  })

  it('conserva i campi opzionali e ignora quelli vuoti', () => {
    const result = parseTravelData({
      manuallyMarked: [],
      visits: [
        {
          id: 'v1',
          countryCode: 'FR',
          date: '2024-07-14',
          city: '  Paris  ',
          note: '   ',
          photoId: 'p1',
          campoSconosciuto: 'ignorato',
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.visits[0]).toEqual({
      id: 'v1',
      countryCode: 'FR',
      date: '2024-07-14',
      city: 'Paris',
      photoId: 'p1',
    })
  })
})

describe('parseTravelDataJson', () => {
  const valid = JSON.stringify({
    formatVersion: 1,
    exportedAt: '2024-05-01T10:00:00.000Z',
    manuallyMarked: ['it', 'JP'],
    visits: [{ id: 'v1', countryCode: 'FR', date: '2024-04-02' }],
  })

  it('accetta un backup vero e proprio', () => {
    const result = parseTravelDataJson(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.manuallyMarked).toEqual(['IT', 'JP'])
    expect(result.data.visits).toHaveLength(1)
  })

  it.each([
    ['stringa vuota', ''],
    ['solo spazi', '   '],
    ['graffa non chiusa', '{"manuallyMarked": ['],
    ['virgola di troppo', '{"manuallyMarked": [],}'],
    ['apici singoli', "{'manuallyMarked': []}"],
    ['non e JSON', 'questo non e un file di backup'],
    ['HTML', '<!doctype html><html><body>404</body></html>'],
    ['un binario travestito', '\u0000\u0001\u0002'],
  ])('rifiuta un file malformato: %s', (_label, text) => {
    const result = parseTravelDataJson(text)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(1)
    // Messaggio per un essere umano, mai il testo dell'eccezione.
    expect(result.errors[0]).toContain('not valid JSON')
    expect(result.errors[0]).not.toMatch(/JSON\.parse|Unexpected token|SyntaxError/)
  })

  it.each([
    ['un numero', '42'],
    ['una stringa', '"ciao"'],
    ['null', 'null'],
    ['un array', '[]'],
  ])('rifiuta un JSON valido che non e un backup: %s', (_label, text) => {
    const result = parseTravelDataJson(text)
    expect(result.ok).toBe(false)
  })

  it('rifiuta un formato piu recente di quello che sa leggere', () => {
    const result = parseTravelDataJson(
      JSON.stringify({ formatVersion: 99, manuallyMarked: [], visits: [] }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]).toContain('newer version')
  })

  it('accetta un backup senza campo di versione: e il formato 1', () => {
    const result = parseTravelDataJson(JSON.stringify({ manuallyMarked: ['IT'], visits: [] }))
    expect(result.ok).toBe(true)
  })

  it('scarta i codici ISO inesistenti e lo dice', () => {
    const result = parseTravelDataJson(
      JSON.stringify({
        formatVersion: 1,
        manuallyMarked: ['IT', 'XX', 'ZZ', 'Atlantide'],
        visits: [
          { id: 'v1', countryCode: 'QQ', date: '2024-01-01' },
          { id: 'v2', countryCode: 'JP', date: '2024-01-02' },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.manuallyMarked).toEqual(['IT'])
    expect(result.data.visits.map((visit) => visit.countryCode)).toEqual(['JP'])
    expect(result.warnings.join(' ')).toContain('unknown ISO code')
    expect(result.warnings.join(' ')).toContain('skipped')
  })

  it('un file di un altra app non passa', () => {
    const result = parseTravelDataJson(
      JSON.stringify({ version: '2.0', places: [{ name: 'Rome' }] }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(' ')).toContain('manuallyMarked')
  })
})
