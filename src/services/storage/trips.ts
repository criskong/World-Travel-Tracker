import { openDatabase } from './db'
import type { Visit } from '../../types'

/**
 * Persistenza dei viaggi.
 * Unico punto di accesso alla tabella `visits`.
 */

/** Tutti i viaggi, dal più recente al più vecchio. */
export async function loadVisits(): Promise<Visit[]> {
  const db = await openDatabase()
  const rows = await db.visits.toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export async function saveVisit(visit: Visit): Promise<void> {
  const db = await openDatabase()
  await db.visits.put(visit)
}

/** Aggiorna un viaggio esistente. Non crea nulla se l'id non esiste. */
export async function updateVisit(id: string, changes: Partial<Omit<Visit, 'id'>>): Promise<void> {
  const db = await openDatabase()
  await db.visits.update(id, changes)
}

export async function removeVisit(id: string): Promise<void> {
  const db = await openDatabase()
  await db.visits.delete(id)
}

/** Sostituisce l'intero contenuto della tabella. Usato dall'import. */
export async function replaceVisits(visits: readonly Visit[]): Promise<void> {
  const db = await openDatabase()
  await db.transaction('rw', db.visits, async () => {
    await db.visits.clear()
    await db.visits.bulkPut(visits as Visit[])
  })
}

export async function clearVisits(): Promise<void> {
  const db = await openDatabase()
  await db.visits.clear()
}
