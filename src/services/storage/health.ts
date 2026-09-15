import { openDatabase } from './db'

/**
 * Stato dell'archiviazione, letto DAL DISCO e non dallo store.
 *
 * Serve a rispondere a "dove sono finiti i miei dati" senza console: su che
 * sito si e (un URL di anteprima e un archivio diverso), se il browser
 * promette di tenere i dati, quanto spazio si usa, e quante righe ci sono
 * davvero in IndexedDB in questo momento — che e l'unica cosa che conta
 * quando lo schermo dice una cosa e il disco un'altra.
 */

export interface StorageHealth {
  /** Host della pagina: due host sono due archivi. */
  host: string
  /** `null` dove `navigator.storage.persist` non esiste (Safari). */
  persisted: boolean | null
  usageBytes: number | null
  quotaBytes: number | null
  /** Righe presenti in IndexedDB adesso. `null` se il database non si apre. */
  onDisk: { countries: number; trips: number; photos: number } | null
}

export async function inspectStorage(): Promise<StorageHealth> {
  const host = typeof location === 'undefined' ? '' : location.host

  let persisted: boolean | null = null
  let usageBytes: number | null = null
  let quotaBytes: number | null = null
  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) persisted = await navigator.storage.persisted()
    } catch {
      persisted = null
    }
    try {
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        usageBytes = estimate.usage ?? null
        quotaBytes = estimate.quota ?? null
      }
    } catch {
      usageBytes = null
      quotaBytes = null
    }
  }

  let onDisk: StorageHealth['onDisk'] = null
  try {
    const db = await openDatabase()
    const [countries, trips, photos] = await Promise.all([
      db.manuallyMarked.count(),
      db.visits.count(),
      db.photos.count(),
    ])
    onDisk = { countries, trips, photos }
  } catch {
    onDisk = null
  }

  return { host, persisted, usageBytes, quotaBytes, onDisk }
}
