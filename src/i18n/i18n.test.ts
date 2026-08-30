import { describe, expect, it } from 'vitest'
import { en } from './en'
import { it as itDictionary } from './it'
import { formatNumber, translate } from './translate'
import { LANGUAGES, detectLanguage, isLanguage } from './languages'
import { compareNames, countryName, formatVisitDate } from './names'
import { COUNTRIES } from '../data/countries/countries'
import { CONTINENTS } from '../types'

/**
 * Lo strato di traduzione.
 *
 * Il controllo piu importante non e che una frase sia giusta — quello lo si
 * legge — ma che le due lingue restino allineate e che i plurali non
 * producano frasi sgrammaticate quando i numeri cambiano.
 */

describe('i due dizionari', () => {
  const enKeys = Object.keys(en).sort()
  const itKeys = Object.keys(itDictionary).sort()

  it('hanno esattamente le stesse chiavi', () => {
    expect(itKeys).toEqual(enKeys)
  })

  it('non hanno traduzioni vuote', () => {
    for (const [key, value] of Object.entries(itDictionary)) {
      expect(value.trim().length, `${key} e vuota`).toBeGreaterThan(0)
    }
  })

  it('ogni plurale ha entrambe le varianti', () => {
    const bases = enKeys
      .filter((key) => key.endsWith('#one'))
      .map((key) => key.slice(0, -'one'.length))
    expect(bases.length).toBeGreaterThan(0)
    for (const base of bases) {
      expect(enKeys, `manca ${base}other`).toContain(`${base}other`)
      expect(itKeys, `manca ${base}other in italiano`).toContain(`${base}other`)
    }
  })

  it('i segnaposto sono gli stessi nelle due lingue', () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

    for (const key of enKeys) {
      const source = placeholders(en[key as keyof typeof en])
      const target = placeholders(itDictionary[key as keyof typeof en])
      // Un segnaposto dimenticato nella traduzione fa sparire un numero dalla
      // frase, e non se ne accorge nessuno finche non si guarda quella schermata.
      expect(target, `${key}: segnaposto diversi`).toEqual(source)
    }
  })

  it('ogni continente ha la sua chiave', () => {
    for (const continent of CONTINENTS) {
      expect(enKeys).toContain(`continent.${continent}`)
    }
  })
})

describe('translate', () => {
  it('restituisce la frase nella lingua chiesta', () => {
    expect(translate('en', 'common.cancel')).toBe('Cancel')
    expect(translate('it', 'common.cancel')).toBe('Annulla')
  })

  it('sostituisce i segnaposto', () => {
    expect(translate('en', 'storage.unknownCountry', { code: 'ZZ' })).toContain('ZZ')
    expect(translate('it', 'storage.unknownCountry', { code: 'ZZ' })).toContain('ZZ')
  })

  it('lascia stare i segnaposto senza valore invece di scrivere undefined', () => {
    expect(translate('en', 'storage.unknownCountry')).toContain('{code}')
  })

  describe('plurali', () => {
    it.each([
      ['en', 1, '1 trip'],
      ['en', 0, '0 trips'],
      ['en', 5, '5 trips'],
      ['it', 1, '1 viaggio'],
      ['it', 0, '0 viaggi'],
      ['it', 5, '5 viaggi'],
    ] as const)('%s con %i', (language, count, expected) => {
      expect(translate(language, 'common.trip#', { count })).toBe(expected)
    })

    it('senza count si comporta come il plurale', () => {
      expect(translate('en', 'common.trip#')).toBe('0 trips')
    })
  })

  it('una lingua sconosciuta ripiega sull inglese invece di lanciare', () => {
    expect(translate('de' as 'en', 'common.cancel')).toBe('Cancel')
  })
})

describe('detectLanguage', () => {
  it.each([
    [['it'], 'it'],
    [['it-IT'], 'it'],
    [['it-CH', 'fr'], 'it'],
    [['en-GB'], 'en'],
    // Inglese di sistema ma italiano come seconda scelta: si legge in inglese,
    // che e la prima delle due lingue che parliamo.
    [['en-US', 'it'], 'en'],
    // Nessuna delle due: si ripiega sull'inglese.
    [['de', 'fr'], 'en'],
    [[], 'en'],
  ])('%j -> %s', (preferred, expected) => {
    expect(detectLanguage(preferred)).toBe(expected)
  })

  it('riconosce solo le lingue che esistono', () => {
    expect(isLanguage('it')).toBe(true)
    expect(isLanguage('de')).toBe(false)
    expect(isLanguage(null)).toBe(false)
    expect(LANGUAGES).toEqual(['en', 'it'])
  })
})

describe('nomi dei Paesi', () => {
  it('in inglese usa i nomi curati di countries.ts', () => {
    expect(countryName('US', 'en')).toBe('United States of America')
    expect(countryName('IT', 'en')).toBe('Italy')
  })

  it('in italiano li prende da Intl', () => {
    expect(countryName('IT', 'it')).toBe('Italia')
    expect(countryName('DE', 'it')).toBe('Germania')
    expect(countryName('JP', 'it')).toBe('Giappone')
    expect(countryName('GL', 'it')).toBe('Groenlandia')
  })

  /** Il controllo che rende sostenibile la scelta di non tradurli a mano. */
  it('tutti e 250 i codici hanno un nome italiano', () => {
    const missing = COUNTRIES.filter((country) => {
      const name = countryName(country.code, 'it')
      return name === country.code || name.trim().length === 0
    })
    expect(missing.map((country) => country.code)).toEqual([])
  })

  /**
   * `ZZ` per ICU e il codice della "regione sconosciuta": senza il controllo
   * sulla fonte di verita, Intl risponderebbe "Regione sconosciuta" al posto
   * di un codice che non esiste.
   */
  it('un codice fuori da countries.ts torna com era', () => {
    expect(countryName('ZZ', 'it')).toBe('ZZ')
    expect(countryName('ZZ', 'en')).toBe('ZZ')
    expect(countryName('QQ', 'it')).toBe('QQ')
  })

  it('ordina secondo la lingua', () => {
    // In italiano la Germania sta fra Francia e Giappone; in inglese Germany
    // sta prima di Japan ma dopo France: e lo stesso, ma i nomi cambiano.
    const italian = ['Germania', 'Francia', 'Giappone'].sort((a, b) => compareNames(a, b, 'it'))
    expect(italian).toEqual(['Francia', 'Germania', 'Giappone'])
  })
})

describe('date e numeri', () => {
  it('la data segue la lingua', () => {
    const english = formatVisitDate('2024-05-01', 'en')
    const italian = formatVisitDate('2024-05-01', 'it')
    expect(english).toContain('2024')
    expect(italian).toContain('2024')
    expect(italian).not.toBe(english)
    expect(italian.toLowerCase()).toContain('mag')
  })

  it('una data non valida torna com era, senza "Invalid Date"', () => {
    expect(formatVisitDate('non-una-data', 'it')).toBe('non-una-data')
  })

  it('i numeri seguono la lingua', () => {
    // L'italiano non raggruppa i numeri di quattro cifre, l'inglese si: e
    // esattamente il genere di dettaglio per cui si usa Intl invece di
    // infilare una virgola a mano.
    expect(formatNumber('en', 1234)).toBe('1,234')
    expect(formatNumber('it', 1234)).toBe('1234')
    expect(formatNumber('en', 12345)).toBe('12,345')
    expect(formatNumber('it', 12345)).toBe('12.345')
  })
})
