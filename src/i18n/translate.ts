import { en } from './en'
import { it } from './it'
import { DEFAULT_LANGUAGE, INTL_LOCALE } from './languages'
import type { Language } from './languages'

/**
 * Traduzione.
 *
 * Niente libreria: i dizionari sono due oggetti letterali e `en` è la fonte
 * delle chiavi, perché `it` è tipizzato come `Record<TranslationKey, string>`.
 * Conseguenza voluta: dimenticare una traduzione italiana non produce una
 * stringa inglese a sorpresa in mezzo alla pagina, produce un errore di
 * compilazione.
 */

export type TranslationKey = keyof typeof en

/**
 * Chiave plurale: la radice comune alle varianti `#one` e `#other`.
 * Si ricava dai tipi, quindi aggiungere una coppia di plurali al dizionario
 * la rende utilizzabile senza dichiarare niente da nessun'altra parte.
 */
type PluralBase<K> = K extends `${infer Base}#one` ? `${Base}#` : never

export type PluralKey = PluralBase<TranslationKey>

/** Tutto cio che si puo passare a `translate`. */
export type MessageKey = TranslationKey | PluralKey

/** Valori da sostituire ai segnaposto `{nome}`. */
export type TranslationVars = Record<string, string | number>

const DICTIONARIES: Readonly<Record<Language, Record<TranslationKey, string>>> = {
  en,
  it,
}

/**
 * Plurale.
 *
 * Una chiave che finisce con `#` ha due varianti, `#one` e `#other`, e si
 * sceglie con `Intl.PluralRules` invece che con `count === 1`: inglese e
 * italiano si comportano allo stesso modo, ma la regola giusta è quella della
 * lingua, non quella che ci ricordiamo noi.
 */
const pluralRules = new Map<Language, Intl.PluralRules>()

function pluralCategory(language: Language, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(language)
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE[language])
    pluralRules.set(language, rules)
  }
  return rules.select(count)
}

function interpolate(template: string, vars: TranslationVars | undefined): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name]
    return value === undefined ? whole : String(value)
  })
}

export function translate(
  language: Language,
  key: MessageKey,
  vars?: TranslationVars,
): string {
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE]

  let resolved: string | undefined = dictionary[key as TranslationKey]
  let values = vars

  // Chiave plurale: `trips.count#` -> `trips.count#one` / `trips.count#other`.
  if (key.endsWith('#')) {
    const count = typeof vars?.count === 'number' ? vars.count : 0
    const variant = `${key}${pluralCategory(language, count)}` as TranslationKey
    resolved = dictionary[variant] ?? dictionary[`${key}other` as TranslationKey]
    // `count` viene sempre valorizzato: chiamare un plurale senza numero e un
    // errore di chi chiama, ma non deve produrre un "{count}" a schermo.
    values = { ...vars, count }
  }

  if (resolved === undefined) {
    // Non dovrebbe succedere: i tipi lo impediscono. Se succede, meglio la
    // chiave che una stringa vuota, perché si vede e si corregge.
    return key
  }
  return interpolate(resolved, values)
}

/** Numero formattato secondo la lingua: separatore delle migliaia compreso. */
export function formatNumber(language: Language, value: number, decimals = 0): string {
  return new Intl.NumberFormat(INTL_LOCALE[language], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
