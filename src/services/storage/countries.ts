import { openDatabase } from './db'

/**
 * Persistenza dei Paesi marcati a mano come visitati.
 * Unico punto di accesso alla tabella `manuallyMarked`.
 */

/** Tutti i codici marcati a mano, ordinati alfabeticamente. */
export async function loadManuallyMarked(): Promise<string[]> {
  const db = await openDatabase()
  const rows = await db.manuallyMarked.toArray()
  return rows.map((row) => row.code).sort()
}

/** Idempotente: marcare due volte lo stesso Paese non crea duplicati. */
export async function addManuallyMarked(code: string): Promise<void> {
  const db = await openDatabase()
  await db.manuallyMarked.put({ code, markedAt: new Date().toISOString() })
}

export async function removeManuallyMarked(code: string): Promise<void> {
  const db = await openDatabase()
  await db.manuallyMarked.delete(code)
}

/** Sostituisce l'intero contenuto della tabella. Usato dall'import. */
export async function replaceManuallyMarked(codes: readonly string[]): Promise<void> {
  const db = await openDatabase()
  const markedAt = new Date().toISOString()
  await db.transaction('rw', db.manuallyMarked, async () => {
    await db.manuallyMarked.clear()
    await db.manuallyMarked.bulkPut(codes.map((code) => ({ code, markedAt })))
  })
}

export async function clearManuallyMarked(): Promise<void> {
  const db = await openDatabase()
  await db.manuallyMarked.clear()
}
