export const LANGUAGES = ['en', 'it'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

/** Nome della lingua nella lingua stessa: come si sceglie in ogni app seria. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  it: 'Italiano',
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * Lingua da usare prima che le preferenze salvate siano state lette.
 *
 * Serve a evitare il lampeggio: senza, un utente italiano vedrebbe mezzo
 * secondo di inglese a ogni avvio, in attesa di IndexedDB. Si guarda l'elenco
 * completo `navigator.languages`, non solo il primo: chi ha l'inglese come
 * lingua di sistema e l'italiano come seconda preferisce comunque leggere
 * nella prima delle due che parliamo.
 */
export function detectLanguage(
  preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Language {
  for (const tag of preferred) {
    // `it-CH` deve valere quanto `it`.
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}

/** Locale BCP-47 per le API `Intl`. */
export const INTL_LOCALE: Readonly<Record<Language, string>> = {
  // en-GB e non en-US: le date in formato giorno/mese sono quelle attese qui.
  en: 'en-GB',
  it: 'it-IT',
}
