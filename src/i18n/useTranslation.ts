import { useCallback, useMemo } from 'react'
import { useTravelStore } from '../store/travelStore'
import { formatNumber, translate } from './translate'
import { compareNames, countryName, formatVisitDate } from './names'
import type { MessageKey, TranslationVars } from './translate'
import type { Language } from './languages'
import type { Continent } from '../types'

export interface Translation {
  language: Language
  /** Traduce una chiave, sostituendo gli eventuali segnaposto `{nome}`. */
  t: (key: MessageKey, vars?: TranslationVars) => string
  /** Nome del Paese nella lingua corrente. */
  country: (code: string) => string
  /** Nome del continente nella lingua corrente. */
  continent: (continent: Continent) => string
  /** Data di un viaggio, formattata secondo la lingua. */
  date: (isoDate: string) => string
  /** Numero formattato secondo la lingua. */
  number: (value: number, decimals?: number) => string
  /** Confronto per ordinamenti alfabetici nella lingua corrente. */
  compare: (a: string, b: string) => number
}

/**
 * Accesso alla lingua corrente e a tutto cio che ne dipende.
 *
 * La lingua vive nello store: cambiarla ri-renderizza chi usa questo hook,
 * senza ricaricare la pagina e senza toccare il globo, che non ha testo.
 */
export function useTranslation(): Translation {
  const language = useTravelStore((state) => state.language)

  const t = useCallback(
    (key: MessageKey, vars?: TranslationVars) => translate(language, key, vars),
    [language],
  )

  return useMemo(
    () => ({
      language,
      t,
      country: (code: string) => countryName(code, language),
      continent: (continent: Continent) => translate(language, `continent.${continent}`),
      date: (isoDate: string) => formatVisitDate(isoDate, language),
      number: (value: number, decimals = 0) => formatNumber(language, value, decimals),
      compare: (a: string, b: string) => compareNames(a, b, language),
    }),
    [language, t],
  )
}
