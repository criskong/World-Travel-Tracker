import { isKnownCountryCode } from './countries'

/**
 * UNICO modulo autorizzato a decidere quale codice ISO-3166-1 alpha-2
 * corrisponde a una feature del GeoJSON Natural Earth.
 *
 * Ordine di risoluzione (come da specifica):
 *   1. `ISO_A2`
 *   2. se vale `-99` o manca -> `ISO_A2_EH`
 *   3. se manca ancora      -> mapping manuale per nome
 *
 * Il codice ottenuto viene infine validato contro la fonte di verità
 * (`countries.ts`): se non è un Paese tracciabile, la feature è considerata
 * NON risolvibile e va renderizzata come non interattiva.
 */

/** Proprietà del GeoJSON che ci interessano. Il dataset ne contiene molte altre. */
export interface CountryFeatureProperties {
  ISO_A2?: string | null
  ISO_A2_EH?: string | null
  NAME?: string | null
  NAME_LONG?: string | null
  ADMIN?: string | null
  SOVEREIGNT?: string | null
  [key: string]: unknown
}

export interface CountryFeature {
  type: 'Feature'
  properties: CountryFeatureProperties
  geometry: unknown
}

export type IsoSource = 'ISO_A2' | 'ISO_A2_EH' | 'NAME_MAP'

export interface IsoResolution {
  /** Codice ISO alpha-2 presente in `countries.ts`, oppure `null`. */
  code: string | null
  /** Da quale campo è arrivato il codice. `null` se non risolto. */
  source: IsoSource | null
  /**
   * `true` quando l'assenza di codice è attesa perché il territorio non ha
   * un codice ISO-3166-1 assegnato (es. Somaliland, Cipro del Nord).
   */
  expectedUnassigned: boolean
}

/**
 * Valori che Natural Earth usa come "nessun codice".
 * `-99` è il segnaposto ufficiale; `CN-TW` compare su Taiwan e non è alpha-2.
 */
const PLACEHOLDER_CODES = new Set(['-99', '-999', '99', 'NA_', ''])

/**
 * Mapping manuale per nome, usato solo quando né `ISO_A2` né `ISO_A2_EH`
 * portano a un codice utilizzabile. Le chiavi sono normalizzate da
 * `normalizeName()`, quindi minuscole e senza segni diacritici.
 */
const NAME_TO_ISO: Readonly<Record<string, string>> = {
  france: 'FR',
  'french republic': 'FR',
  norway: 'NO',
  'kingdom of norway': 'NO',
  kosovo: 'XK',
  'republic of kosovo': 'XK',
  taiwan: 'TW',
  'republic of china': 'TW',
  // Nomi Natural Earth che divergono dal nostro elenco: presenti per sicurezza,
  // servono solo se il dataset venisse sostituito con una variante priva di ISO_A2.
  'w. sahara': 'EH',
  'western sahara': 'EH',
  'dem. rep. congo': 'CD',
  'central african rep.': 'CF',
  'bosnia and herz.': 'BA',
  'dominican rep.': 'DO',
  'eq. guinea': 'GQ',
  'falkland is.': 'FK',
  'fr. s. antarctic lands': 'TF',
  'solomon is.': 'SB',
  's. sudan': 'SS',
  eswatini: 'SZ',
  'united states of america': 'US',
  palestine: 'PS',
}

/**
 * Territori che compaiono nel dataset ma NON hanno un codice ISO-3166-1:
 * la mancata risoluzione è corretta e attesa, non un bug del resolver.
 * Restano visibili sul globo ma non interattivi.
 *
 * `siachen glacier` compare solo nel 50m: è un'area contesa fra India e
 * Pakistan, Natural Earth le assegna `TYPE: "Indeterminate"` e `-99` sia in
 * `ISO_A2` sia in `ISO_A2_EH`. Non esiste un codice ISO da attribuirle, e
 * assegnarla all'uno o all'altro sarebbe una presa di posizione che questa
 * app non ha motivo di prendere.
 */
const UNASSIGNED_TERRITORIES = new Set([
  'n. cyprus',
  'northern cyprus',
  'somaliland',
  'siachen glacier',
])

/** Minuscolo, senza diacritici, spazi normalizzati. */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** `true` solo per stringhe di due lettere maiuscole che non siano segnaposto. */
function isUsableCode(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const candidate = value.trim().toUpperCase()
  if (PLACEHOLDER_CODES.has(candidate)) return false
  return /^[A-Z]{2}$/.test(candidate)
}

/** Tutti i nomi utili di una feature, in ordine di specificità. */
function candidateNames(properties: CountryFeatureProperties): string[] {
  return [properties.NAME, properties.ADMIN, properties.NAME_LONG, properties.SOVEREIGNT]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(normalizeName)
}

/** Risoluzione completa, con la provenienza del codice: utile per la diagnostica. */
export function resolveIso(feature: CountryFeature): IsoResolution {
  const properties = feature.properties ?? {}
  const names = candidateNames(properties)
  const expectedUnassigned = names.some((name) => UNASSIGNED_TERRITORIES.has(name))

  const attempts: Array<{ source: IsoSource; value: unknown }> = [
    { source: 'ISO_A2', value: properties.ISO_A2 },
    { source: 'ISO_A2_EH', value: properties.ISO_A2_EH },
  ]

  for (const attempt of attempts) {
    if (!isUsableCode(attempt.value)) continue
    const code = attempt.value.trim().toUpperCase()
    if (isKnownCountryCode(code)) {
      return { code, source: attempt.source, expectedUnassigned: false }
    }
  }

  for (const name of names) {
    const mapped = NAME_TO_ISO[name]
    if (mapped && isKnownCountryCode(mapped)) {
      return { code: mapped, source: 'NAME_MAP', expectedUnassigned: false }
    }
  }

  return { code: null, source: null, expectedUnassigned }
}

/** Scorciatoia: solo il codice, o `null` se la feature non è risolvibile. */
export function resolveIsoA2(feature: CountryFeature): string | null {
  return resolveIso(feature).code
}

/** Nome leggibile della feature, per tooltip e messaggi di diagnostica. */
export function featureDisplayName(feature: CountryFeature): string {
  const properties = feature.properties ?? {}
  return (
    properties.ADMIN ??
    properties.NAME ??
    properties.NAME_LONG ??
    properties.SOVEREIGNT ??
    'Unknown'
  )
}
