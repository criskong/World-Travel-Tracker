import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { featureDisplayName, resolveIso, resolveIsoA2 } from './isoResolver'
import { GEOJSON_FILENAME } from './dataset'
import { isKnownCountryCode } from './countries'
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

/**
 * Il percorso del file NON è scritto qui: arriva da `dataset.ts`, la stessa
 * costante che l'app usa per la fetch. Cambiando dataset questi test leggono
 * il file nuovo e i conteggi qui sotto falliscono finché non li si rivede —
 * che è esattamente quello che deve succedere.
 */
describe(`dataset committato (${GEOJSON_FILENAME})`, () => {
  const geojson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data', GEOJSON_FILENAME), 'utf8'),
  ) as { features: CountryFeature[] }

  /**
   * Codici ISO che Natural Earth assegna legittimamente a più di una feature.
   * Non è un rilassamento del controllo sui duplicati: ogni eccezione elenca
   * le feature attese, e un duplicato non previsto fa fallire il test.
   */
  const EXPECTED_MULTI_FEATURE_CODES: Readonly<Record<string, readonly string[]>> = {
    // Natural Earth marca `ISO_A2: AU` anche sulle due dipendenze esterne
    // dell'Australia, che nel 50m hanno una feature propria. Colorarle
    // insieme all'Australia è il comportamento giusto: sono territori
    // australiani. Nota che questo lascia CC e CX senza geometria propria.
    AU: ['Ashmore and Cartier Islands', 'Australia', 'Indian Ocean Territories'],
  }

  it('ha il numero di feature atteso', () => {
    expect(geojson.features).toHaveLength(242)
  })

  it('risolve Francia, Norvegia e Kosovo sulle feature reali', () => {
    const byName = (name: string) =>
      geojson.features.find((f) => f.properties.NAME === name) as CountryFeature

    expect(resolveIsoA2(byName('France'))).toBe('FR')
    expect(resolveIsoA2(byName('Norway'))).toBe('NO')
    expect(resolveIsoA2(byName('Kosovo'))).toBe('XK')
  })

  it('risolve 239 feature su 242', () => {
    const resolved = geojson.features.filter((f) => resolveIsoA2(f) !== null)
    expect(resolved).toHaveLength(239)
  })

  it('lascia non risolte solo le tre feature senza codice ISO', () => {
    const unresolved = geojson.features
      .filter((f) => resolveIsoA2(f) === null)
      .map((f) => featureDisplayName(f))
      .sort()

    expect(unresolved).toEqual(['Northern Cyprus', 'Siachen Glacier', 'Somaliland'])
  })

  it('marca tutte le non risolte come attese: nessuna sorpresa per il resolver', () => {
    const surprises = geojson.features
      .map((f) => ({ name: featureDisplayName(f), outcome: resolveIso(f) }))
      .filter((item) => item.outcome.code === null && !item.outcome.expectedUnassigned)
      .map((item) => item.name)

    expect(surprises).toEqual([])
  })

  it('assegna ogni codice ISO a una sola feature, salvo le eccezioni dichiarate', () => {
    const byCode = new Map<string, string[]>()
    for (const feature of geojson.features) {
      const code = resolveIsoA2(feature)
      if (code === null) continue
      const names = byCode.get(code)
      if (names) names.push(featureDisplayName(feature))
      else byCode.set(code, [featureDisplayName(feature)])
    }

    const duplicated = [...byCode.entries()].filter(([, names]) => names.length > 1)

    // Nessun duplicato oltre a quelli dichiarati...
    expect(duplicated.map(([code]) => code).sort()).toEqual(
      Object.keys(EXPECTED_MULTI_FEATURE_CODES).sort(),
    )
    // ...e ogni eccezione copre esattamente le feature che ci aspettiamo.
    for (const [code, names] of duplicated) {
      expect([...names].sort()).toEqual([...EXPECTED_MULTI_FEATURE_CODES[code]!].sort())
    }
  })

  it("l'elenco delle eccezioni non contiene codici che non sono più duplicati", () => {
    for (const code of Object.keys(EXPECTED_MULTI_FEATURE_CODES)) {
      const count = geojson.features.filter((f) => resolveIsoA2(f) === code).length
      expect(count, `${code} non è più duplicato: togli l'eccezione`).toBeGreaterThan(1)
    }
  })

  it('ogni codice risolto esiste nella fonte di verità', () => {
    const unknown = geojson.features
      .map((f) => resolveIsoA2(f))
      .filter((code): code is string => code !== null)
      .filter((code) => !isKnownCountryCode(code))

    expect(unknown).toEqual([])
  })
})
