import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Visit } from '../../types'

/**
 * Schema Dexie e apertura del database.
 *
 * ⚠️ MODULO INTERNO AL LAYER DI STORAGE.
 * Solo i file dentro `src/services/storage/` possono importarlo. Componenti,
 * store e utility devono passare da `countries.ts`, `trips.ts`, `photos.ts`.
 * Il vincolo è verificato dal test `storageLayer.test.ts`.
 */

const DATABASE_NAME = 'world-travel-tracker'

/** Un Paese marcato a mano come visitato, senza un viaggio associato. */
export interface MarkedCountryRow {
  /** ISO-3166-1 alpha-2. Chiave primaria. */
  code: string
  markedAt: string
}

export type VisitRow = Visit

/** La foto vive qui come Blob; `Visit.photoId` la referenzia. Mai base64. */
export interface PhotoRow {
  id: string
  blob: Blob
  createdAt: string
}

/**
 * Copia locale del dataset geografico, per non riscaricarlo a ogni avvio.
 *
 * Non sono dati dell'utente: è contenuto dell'app messo da parte. Per questo
 * `resetData` non lo tocca — cancellarlo costringerebbe a riscaricare 3 MB
 * per aver chiesto di dimenticare i propri viaggi.
 */
export interface PreferenceRow {
  key: string
  value: string
}

export interface DatasetRow {
  /** Nome del file del dataset. Cambia il file, cambia la chiave. */
  key: string
  text: string
  bytes: number
  cachedAt: string
}

export class TravelDatabase extends Dexie {
  manuallyMarked!: Table<MarkedCountryRow, string>
  visits!: Table<VisitRow, string>
  photos!: Table<PhotoRow, string>
  datasets!: Table<DatasetRow, string>
  preferences!: Table<PreferenceRow, string>

  constructor() {
    super(DATABASE_NAME)

    // Versionamento esplicito: ogni modifica allo schema aggiunge un blocco
    // `version(n).stores(...)` senza mai riscrivere i precedenti.
    this.version(1).stores({
      manuallyMarked: '&code, markedAt',
      visits: '&id, countryCode, date',
      photos: '&id, createdAt',
    })

    // v2: cache del dataset geografico. Dexie applica un diff, quindi qui
    // compare solo la tabella nuova; le tre di prima restano come sono.
    this.version(2).stores({
      datasets: '&key',
    })

    // v3: preferenze dell'interfaccia, oggi solo la lingua. Non sono dati di
    // viaggio: restano fuori dal backup e da `resetData`.
    this.version(3).stores({
      preferences: '&key',
    })

    /*
     * v4: da una foto per viaggio a molte. Lo schema degli indici non cambia,
     * cambia la forma delle righe — quindi niente `.stores()` nuovo ma un
     * `.upgrade()`: chi aveva gia dei viaggi con `photoId` se li ritrova in
     * `photoIds`, senza perdere niente e senza doverci pensare.
     */
    this.version(4)
      .stores({})
      .upgrade(async (transaction) => {
        await transaction
          .table('visits')
          .toCollection()
          .modify((visit: { photoId?: string; photoIds?: string[] }) => {
            if (typeof visit.photoId === 'string' && visit.photoId.length > 0) {
              visit.photoIds = [visit.photoId]
            }
            delete visit.photoId
          })
      })
  }
}

/** Motivo per cui l'archiviazione non è utilizzabile. */
export type StorageUnavailableReason = 'no-indexeddb' | 'open-failed'

/** IndexedDB non disponibile: Safari in navigazione privata, quota, o permessi. */
export class StorageUnavailableError extends Error {
  readonly reason: StorageUnavailableReason

  constructor(reason: StorageUnavailableReason, cause?: unknown) {
    super(
      reason === 'no-indexeddb'
        ? 'IndexedDB non è disponibile in questo browser o in questa modalità di navigazione.'
        : "Apertura del database locale fallita.",
    )
    this.name = 'StorageUnavailableError'
    this.reason = reason
    this.cause = cause
  }
}

let openPromise: Promise<TravelDatabase> | null = null

function indexedDbIsPresent(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    // Alcuni browser lanciano al solo accesso alla proprietà con i cookie bloccati.
    return false
  }
}

/**
 * Apre il database una sola volta per sessione.
 * Rifiuta con `StorageUnavailableError` se IndexedDB non è utilizzabile:
 * i chiamanti devono gestirlo, non propagarlo all'utente come stack trace.
 */
export function openDatabase(): Promise<TravelDatabase> {
  if (!openPromise) {
    openPromise = (async () => {
      if (!indexedDbIsPresent()) {
        throw new StorageUnavailableError('no-indexeddb')
      }
      const database = new TravelDatabase()
      try {
        await database.open()
      } catch (error) {
        database.close()
        throw new StorageUnavailableError('open-failed', error)
      }
      return database
    })()

    // Un fallimento non resta in cache: un nuovo tentativo deve poter riprovare.
    openPromise.catch(() => {
      openPromise = null
    })
  }
  return openPromise
}

/** Chiude il database e azzera la cache. Usato dai test e da `resetData`. */
export async function closeDatabase(): Promise<void> {
  const pending = openPromise
  openPromise = null
  if (!pending) return
  try {
    const database = await pending
    database.close()
  } catch {
    // Se non si era mai aperto non c'è nulla da chiudere.
  }
}
