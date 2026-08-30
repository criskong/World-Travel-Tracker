import { openDatabase } from './db'
import { newId } from '../../utils/id'

/**
 * Persistenza delle foto.
 * Le immagini vivono qui come `Blob`; i viaggi le referenziano tramite
 * `Visit.photoIds`. Mai base64 in IndexedDB: pesa ~33% in più e blocca il
 * thread in serializzazione.
 */

/** Salva un Blob e restituisce l'id da mettere in `Visit.photoIds`. */
export async function savePhoto(blob: Blob): Promise<string> {
  const db = await openDatabase()
  const id = newId()
  await db.photos.put({ id, blob, createdAt: new Date().toISOString() })
  return id
}

/**
 * Salva un Blob CONSERVANDO il suo id. Serve al ripristino da un backup:
 * i viaggi importati referenziano gli id che avevano, e riassegnarne di nuovi
 * spezzerebbe il collegamento.
 */
export async function restorePhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDatabase()
  await db.photos.put({ id, blob, createdAt: new Date().toISOString() })
}

/** Tutte le foto presenti, con il loro id. Serve all'export. */
export async function loadAllPhotos(): Promise<{ id: string; blob: Blob }[]> {
  const db = await openDatabase()
  const rows = await db.photos.toArray()
  return rows.map((row) => ({ id: row.id, blob: row.blob }))
}

export async function loadPhoto(id: string): Promise<Blob | undefined> {
  const db = await openDatabase()
  const row = await db.photos.get(id)
  return row?.blob
}

export async function removePhoto(id: string): Promise<void> {
  const db = await openDatabase()
  await db.photos.delete(id)
}

/**
 * Elimina le foto non più referenziate da nessun viaggio.
 * Serve dopo un import o la cancellazione di un viaggio: senza questo i Blob
 * resterebbero a occupare quota per sempre.
 */
export async function removeOrphanPhotos(): Promise<number> {
  const db = await openDatabase()
  return db.transaction('rw', db.photos, db.visits, async () => {
    const visits = await db.visits.toArray()
    const referenced = new Set(
      visits.flatMap((visit) => visit.photoIds ?? []),
    )
    const ids = await db.photos.toCollection().primaryKeys()
    const orphans = ids.filter((id) => !referenced.has(id))
    if (orphans.length > 0) {
      await db.photos.bulkDelete(orphans)
    }
    return orphans.length
  })
}

export async function clearPhotos(): Promise<void> {
  const db = await openDatabase()
  await db.photos.clear()
}
