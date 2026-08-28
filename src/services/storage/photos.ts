import { openDatabase } from './db'
import { newId } from '../../utils/id'

/**
 * Persistenza delle foto.
 * Le immagini vivono qui come `Blob`; i viaggi le referenziano tramite
 * `Visit.photoId`. Mai base64 in IndexedDB: pesa ~33% in più e blocca il
 * thread in serializzazione.
 */

/** Salva un Blob e restituisce l'id da mettere in `Visit.photoId`. */
export async function savePhoto(blob: Blob): Promise<string> {
  const db = await openDatabase()
  const id = newId()
  await db.photos.put({ id, blob, createdAt: new Date().toISOString() })
  return id
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
      visits.map((visit) => visit.photoId).filter((id): id is string => typeof id === 'string'),
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
