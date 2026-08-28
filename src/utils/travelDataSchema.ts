import { isKnownCountryCode } from '../data/countries/countries'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'
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
  warnings: string[]
}

export interface TravelDataValidationFailure {
  ok: false
  errors: string[]
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

/** Valida e normalizza un payload di import. Non tocca mai il database. */
export function parseTravelData(input: unknown): TravelDataValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isPlainObject(input)) {
    return { ok: false, errors: ['This file does not contain a valid JSON object.'] }
  }

  const formatVersion = input.formatVersion
  if (typeof formatVersion === 'number' && formatVersion > TRAVEL_DATA_FORMAT_VERSION) {
    errors.push(
      `This file was created by a newer version of the app (format ${formatVersion}).`,
    )
  }

  if (!Array.isArray(input.manuallyMarked)) {
    errors.push('Missing "manuallyMarked" field, or it is not a list.')
  }
  if (!Array.isArray(input.visits)) {
    errors.push('Missing "visits" field, or it is not a list.')
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
    warnings.push(
      `${discardedMarked} ${discardedMarked === 1 ? 'country was' : 'countries were'} skipped: unknown ISO code.`,
    )
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
    const photoId = optionalText(entry.photoId)
    if (city !== undefined) visit.city = city
    if (note !== undefined) visit.note = note
    if (photoId !== undefined) visit.photoId = photoId
    visits.push(visit)
  }

  if (discardedVisits > 0) {
    warnings.push(
      `${discardedVisits} ${discardedVisits === 1 ? 'trip was' : 'trips were'} skipped: incomplete or invalid data.`,
    )
  }

  return {
    ok: true,
    data: { manuallyMarked: [...marked].sort(), visits },
    warnings,
  }
}
