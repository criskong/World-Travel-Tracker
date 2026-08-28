import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { featureDisplayName, resolveIso, resolveIsoA2 } from './isoResolver'
import type { CountryFeature } from './isoResolver'

function feature(properties: Record<string, unknown>): CountryFeature {
  return { type: 'Feature', properties, geometry: null }
}

describe('resolveIsoA2', () => {
  it('usa ISO_A2 quando è valido', () => {
    expect(resolveIsoA2(feature({ ISO_A2: 'IT', ISO_A2_EH: 'IT', NAME: 'Italy' }))).toBe('IT')
  })

  it('risolve la Francia via ISO_A2_EH quando ISO_A2 è -99', () => {
    const france = feature({ ISO_A2: '-99', ISO_A2_EH: 'FR', NAME: 'France', ADMIN: 'France' })
    expect(resolveIso(france)).toEqual({ code: 'FR', source: 'ISO_A2_EH', expectedUnassigned: false })
  })

  it('risolve la Norvegia via ISO_A2_EH quando ISO_A2 è -99', () => {
    const norway = feature({ ISO_A2: '-99', ISO_A2_EH: 'NO', NAME: 'Norway', ADMIN: 'Norway' })
    expect(resolveIso(norway)).toEqual({ code: 'NO', source: 'ISO_A2_EH', expectedUnassigned: false })
  })

  it('risolve il Kosovo su XK', () => {
    const kosovo = feature({ ISO_A2: '-99', ISO_A2_EH: 'XK', NAME: 'Kosovo', ADMIN: 'Kosovo' })
    expect(resolveIso(kosovo)).toEqual({ code: 'XK', source: 'ISO_A2_EH', expectedUnassigned: false })
  })

  it('ricade sul mapping per nome quando entrambi i campi ISO mancano', () => {
    expect(resolveIso(feature({ NAME: 'France' }))).toEqual({
      code: 'FR',
      source: 'NAME_MAP',
      expectedUnassigned: false,
    })
    expect(resolveIso(feature({ ISO_A2: '-99', ISO_A2_EH: '-99', NAME: 'Norway' })).code).toBe('NO')
    expect(resolveIso(feature({ ISO_A2: '-99', ISO_A2_EH: '-99', ADMIN: 'Kosovo' })).code).toBe('XK')
  })

  it('scarta ISO_A2 non alpha-2 (Taiwan: CN-TW) e usa ISO_A2_EH', () => {
    const taiwan = feature({ ISO_A2: 'CN-TW', ISO_A2_EH: 'TW', NAME: 'Taiwan' })
    expect(resolveIso(taiwan)).toEqual({ code: 'TW', source: 'ISO_A2_EH', expectedUnassigned: false })
  })

  it('non risolve i territori senza codice ISO e li marca come attesi', () => {
    const northernCyprus = feature({
      ISO_A2: '-99',
      ISO_A2_EH: '-99',
      NAME: 'N. Cyprus',
      ADMIN: 'Northern Cyprus',
    })
    const somaliland = feature({ ISO_A2: '-99', ISO_A2_EH: '-99', NAME: 'Somaliland' })

    expect(resolveIso(northernCyprus)).toEqual({
      code: null,
      source: null,
      expectedUnassigned: true,
    })
    expect(resolveIso(somaliland)).toEqual({ code: null, source: null, expectedUnassigned: true })
  })

  it('non risolve una feature sconosciuta e non la marca come attesa', () => {
    expect(resolveIso(feature({ NAME: 'Atlantis' }))).toEqual({
      code: null,
      source: null,
      expectedUnassigned: false,
    })
  })

  it('ignora maiuscole/minuscole e spazi nei codici', () => {
    expect(resolveIsoA2(feature({ ISO_A2: ' it ' }))).toBe('IT')
  })
})

describe('featureDisplayName', () => {
  it('preferisce ADMIN a NAME', () => {
    expect(featureDisplayName(feature({ NAME: 'N. Cyprus', ADMIN: 'Northern Cyprus' }))).toBe(
      'Northern Cyprus',
    )
  })
})

describe('dataset Natural Earth 110m committato', () => {
  const geojson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/countries-110m.geojson'), 'utf8'),
  ) as { features: CountryFeature[] }

  it('risolve Francia, Norvegia e Kosovo sulle feature reali', () => {
    const byName = (name: string) =>
      geojson.features.find((f) => f.properties.NAME === name) as CountryFeature

    expect(resolveIsoA2(byName('France'))).toBe('FR')
    expect(resolveIsoA2(byName('Norway'))).toBe('NO')
    expect(resolveIsoA2(byName('Kosovo'))).toBe('XK')
  })

  it('lascia non risolte solo N. Cyprus e Somaliland', () => {
    const unresolved = geojson.features
      .filter((f) => resolveIsoA2(f) === null)
      .map((f) => featureDisplayName(f))
      .sort()

    expect(unresolved).toEqual(['Northern Cyprus', 'Somaliland'])
  })

  it('non assegna lo stesso codice ISO a due feature diverse', () => {
    const codes = geojson.features
      .map((f) => resolveIsoA2(f))
      .filter((code): code is string => code !== null)

    expect(codes.length).toBe(new Set(codes).size)
  })
})
