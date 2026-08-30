import { isKnownCountryCode } from '../data/countries/countries'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'
import type { LocalizedMessage } from '../i18n/message'
import type { TravelData, Visit } from '../types'

/**
 * Validazione del JSON importato.
 *
 * Il file arriva dal disco dell'utente: può essere di un'altra app, di una
 * versione futura o semplicemente corrotto. Niente `as TravelData`, niente
 * fiducia: quello che non supera i controlli non entra in IndexedDB.
 *
 * `errors` = il file non è importabile.
 * `warnings` = il file è importabile, ma alcune voci sono state scartate.
 */

export interface TravelDataValidationSuccess {
  ok: true
  data: TravelData
  warnings: LocalizedMessage[]
}

export interface TravelDataValidationFailure {
  ok: false
  errors: LocalizedMessage[]
}

export type TravelDataValidationResult =
  | TravelDataValidationSuccess
  | TravelDataValidationFailure

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** `true` per una data `YYYY-MM-DD` che esiste davvero nel calendario. */
export function isValidVisitDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(timestamp)) return false
  // Scarta i rolling automatici tipo 2024-02-31 -> 2024-03-02.
  return new Date(timestamp).toISOString().slice(0, 10) === value
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return isKnownCountryCode(code) ? code : null
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Riferimenti alle foto, da entrambi i formati.
 * Il formato 1 aveva `photoId`, uno solo per viaggio; il 2 ha `photoIds`.
 * I backup vecchi devono continuare a funzionare: sono di qualcuno.
 */
function readPhotoIds(entry: Record<string, unknown>): string[] {
  const single = optionalText(entry.photoId)
  const many = Array.isArray(entry.photoIds)
    ? entry.photoIds.map(optionalText).filter((id): id is string => id !== undefined)
    : []
  const all = single === undefined ? many : [single, ...many]
  // Nessun duplicato: due riferimenti allo stesso Blob non hanno senso.
  return [...new Set(all)]
}

/** Valida e normalizza un payload di import. Non tocca mai il database. */
export function parseTravelData(input: unknown): TravelDataValidationResult {
  const errors: LocalizedMessage[] = []
  const warnings: LocalizedMessage[] = []

  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ key: 'validation.notObject' }] }
  }

  const formatVersion = input.formatVersion
  if (typeof formatVersion === 'number' && formatVersion > TRAVEL_DATA_FORMAT_VERSION) {
    errors.push({ key: 'validation.futureFormat', vars: { version: formatVersion } })
  }

  if (!Array.isArray(input.manuallyMarked)) {
    errors.push({ key: 'validation.missingMarked' })
  }
  if (!Array.isArray(input.visits)) {
    errors.push({ key: 'validation.missingVisits' })
  }
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const rawMarked = input.manuallyMarked as unknown[]
  const marked = new Set<string>()
  let discardedMarked = 0
  for (const entry of rawMarked) {
    const code = normalizeCode(entry)
    if (code === null) {
      discardedMarked += 1
      continue
    }
    marked.add(code)
  }
  if (discardedMarked > 0) {
    warnings.push({
      key: 'validation.skippedCountries#',
      vars: { count: discardedMarked },
    })
  }

  const rawVisits = input.visits as unknown[]
  const visits: Visit[] = []
  const seenIds = new Set<string>()
  let discardedVisits = 0

  for (const entry of rawVisits) {
    if (!isPlainObject(entry)) {
      discardedVisits += 1
      continue
    }
    const code = normalizeCode(entry.countryCode)
    const id = typeof entry.id === 'string' ? entry.id.trim() : ''
    if (code === null || id === '' || !isValidVisitDate(entry.date) || seenIds.has(id)) {
      discardedVisits += 1
      continue
    }
    seenIds.add(id)

    const visit: Visit = { id, countryCode: code, date: entry.date }
    const city = optionalText(entry.city)
    const note = optionalText(entry.note)
    if (city !== undefined) visit.city = city
    if (note !== undefined) visit.note = note

    const photoIds = readPhotoIds(entry)
    if (photoIds.length > 0) visit.photoIds = photoIds
    visits.push(visit)
  }

  if (discardedVisits > 0) {
    warnings.push({ key: 'validation.skippedTrips#', vars: { count: discardedVisits } })
  }

  return {
    ok: true,
    data: { manuallyMarked: [...marked].sort(), visits },
    warnings,
  }
}

/**
 * Punto di ingresso per un file scelto dall'utente: testo grezzo in entrata,
 * esito già validato in uscita.
 *
 * Serve perché un file può fallire in due modi diversi che l'utente vive allo
 * stesso modo — non è JSON, oppure è JSON ma non è un backup di questa app — e
 * in entrambi i casi la risposta deve essere un messaggio comprensibile, non
 * un'eccezione. Nessuna scrittura avviene qui: chi chiama scrive solo se
 * `ok` è `true`.
 */
export function parseTravelDataJson(text: string): TravelDataValidationResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: [{ key: 'validation.notJson' }] }
  }
  return parseTravelData(raw)
}
