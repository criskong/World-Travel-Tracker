/**
 * Richiesta di archiviazione persistente.
 *
 * Senza `navigator.storage.persist()` iOS Safari può evictare IndexedDB dopo
 * ~7 giorni di inattività: l'utente perderebbe i dati senza alcun preavviso.
 * Non dipende da Dexie, quindi non importa `db.ts`.
 */

export type PersistenceResult = 'granted' | 'denied' | 'unsupported'

export async function requestPersistentStorage(): Promise<PersistenceResult> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported'
  }
  try {
    if (await navigator.storage.persisted()) return 'granted'
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    // Alcuni browser lanciano invece di rispondere: non è un errore fatale.
    return 'unsupported'
  }
}
