import { getCountry } from '../data/countries/countries'
import { DEFAULT_LANGUAGE, INTL_LOCALE } from './languages'
import type { Language } from './languages'

/**
 * Nomi localizzati di Paesi e continenti, e date.
 *
 * I nomi dei Paesi in italiano NON sono un dizionario nostro: arrivano da
 * `Intl.DisplayNames`, che il browser ha gia dentro e che copre tutti e 250 i
 * codici del nostro elenco (verificato). Mantenere a mano 250 traduzioni che
 * il browser conosce gia sarebbe lavoro sprecato e una fonte di errori in
 * piu, e funziona offline perche i dati ICU sono locali.
 *
 * In inglese si usa invece `countries.ts`, che resta la fonte di verita: i
 * suoi nomi sono curati ("United States of America", non "United States") e
 * cambiare avrebbe cambiato la UI inglese senza motivo.
 */

const displayNames = new Map<Language, Intl.DisplayNames | null>()

function regionNames(language: Language): Intl.DisplayNames | null {
  if (!displayNames.has(language)) {
    try {
      displayNames.set(
        language,
        new Intl.DisplayNames([INTL_LOCALE[language]], { type: 'region', fallback: 'none' }),
      )
    } catch {
      // Ambiente senza dati ICU per quella lingua: si ripiega sull'inglese.
      displayNames.set(language, null)
    }
  }
  return displayNames.get(language) ?? null
}

/** Cache per lingua: la lista Paesi ne chiede 250 a ogni carattere digitato. */
const nameCache = new Map<Language, Map<string, string>>()

/**
 * Nome del Paese nella lingua scelta.
 * Se `Intl` non conosce il codice si torna al nome inglese curato, e in
 * ultima istanza al codice stesso: non si mostra mai una stringa vuota.
 */
export function countryName(code: string, language: Language = DEFAULT_LANGUAGE): string {
  const known = getCountry(code)
  const fallback = known?.name ?? code
  // Fuori dalla fonte di verita non si chiede niente a Intl: per un codice
  // come `ZZ` risponderebbe "Regione sconosciuta", che e peggio del codice.
  if (language === DEFAULT_LANGUAGE || !known) return fallback

  let cache = nameCache.get(language)
  if (!cache) {
    cache = new Map()
    nameCache.set(language, cache)
  }
  const cached = cache.get(code)
  if (cached !== undefined) return cached

  let resolved = fallback
  try {
    const localized = regionNames(language)?.of(code)
    if (localized && localized !== code) resolved = localized
  } catch {
    // `of()` lancia sui codici non validi: il fallback e gia pronto.
  }
  cache.set(code, resolved)
  return resolved
}

/** Confronto per l'ordinamento alfabetico nella lingua corrente. */
export function compareNames(a: string, b: string, language: Language): number {
  return a.localeCompare(b, INTL_LOCALE[language])
}

/** Data di un viaggio, scritta come la scriverebbe chi legge. */
export function formatVisitDate(date: string, language: Language = DEFAULT_LANGUAGE): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat(INTL_LOCALE[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}
