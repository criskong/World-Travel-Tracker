import { ZipError, createZip, looksLikeZip, readZip } from './zip'
import type { TravelDataExport } from '../types'

/**
 * Il file di backup.
 *
 * È uno ZIP e non più un JSON, perché il JSON non può contenere dati binari e
 * le foto ci sarebbero entrate solo in base64: +33% di peso e un unico file
 * di testo da decine di megabyte da tenere tutto in memoria. Nello ZIP le
 * foto restano file veri — si aprono con un doppio clic anche senza l'app.
 *
 * ```
 * world-travel-tracker-backup.zip
 *   backup.json          i Paesi e i viaggi
 *   photos/<id>.jpg      una per foto, con l'id che i viaggi referenziano
 *   LEGGIMI.txt          cosa c'è dentro
 * ```
 *
 * L'import accetta ancora i vecchi `.json` esportati prima: sono backup di
 * qualcuno, e romperli sarebbe il modo peggiore di introdurre un formato.
 */

export const BACKUP_FILENAME = 'world-travel-tracker-backup.zip'

/** Nome del JSON dentro l'archivio. */
export const BACKUP_JSON_ENTRY = 'backup.json'
const PHOTO_DIRECTORY = 'photos/'
const READ_ME_ENTRY = 'LEGGIMI.txt'

export interface BackupPhoto {
  id: string
  blob: Blob
}

export interface BackupBundle {
  data: TravelDataExport
  photos: readonly BackupPhoto[]
}

/** Contenuto di un backup letto dal disco, pronto per la validazione. */
export interface ParsedBackupFile {
  /** Il testo di `backup.json`, ancora da validare. */
  json: string
  /** Le foto trovate, per id. Vuota per i vecchi backup in JSON. */
  photos: Map<string, Blob>
  /** `true` se il file era uno ZIP con le foto dentro. */
  hadPhotos: boolean
}

const EXTENSION_BY_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

const READ_ME = `World Travel Tracker — backup

backup.json   i Paesi segnati e i viaggi
photos/       le foto, una per file; il nome e l'id che i viaggi referenziano

Per ripristinare: apri l'app, vai in Impostazioni > Importa un backup e scegli
questo file .zip cosi com'e, senza scompattarlo.

---

backup.json   the countries you marked and your trips
photos/       your photos, one per file, named after the id the trips point to

To restore: open the app, go to Settings > Import a backup and pick this .zip
file as it is, without unzipping it.
`

/** Costruisce l'archivio. Le foto restano binarie: nessuna base64. */
export async function buildBackupZip(bundle: BackupBundle): Promise<Blob> {
  const encoder = new TextEncoder()

  const entries = [
    { name: BACKUP_JSON_ENTRY, bytes: encoder.encode(JSON.stringify(bundle.data, null, 2)) },
    { name: READ_ME_ENTRY, bytes: encoder.encode(READ_ME) },
  ]

  for (const photo of bundle.photos) {
    const extension = EXTENSION_BY_TYPE[photo.blob.type] ?? 'bin'
    entries.push({
      name: `${PHOTO_DIRECTORY}${photo.id}.${extension}`,
      bytes: new Uint8Array(await photo.blob.arrayBuffer()),
    })
  }

  return new Blob([createZip(entries) as unknown as BlobPart], { type: 'application/zip' })
}

/**
 * Legge un file scelto dall'utente, ZIP o vecchio JSON.
 * Il formato si riconosce dai byte, non dall'estensione: un file rinominato
 * non deve produrre un errore incomprensibile.
 */
export async function readBackupFile(file: Blob): Promise<ParsedBackupFile> {
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (!looksLikeZip(bytes)) {
    return { json: new TextDecoder().decode(bytes), photos: new Map(), hadPhotos: false }
  }

  const entries = readZip(bytes)
  const jsonEntry = entries.find((entry) => entry.name === BACKUP_JSON_ENTRY)
  if (!jsonEntry) {
    throw new ZipError(`nell'archivio manca ${BACKUP_JSON_ENTRY}`)
  }

  const photos = new Map<string, Blob>()
  for (const entry of entries) {
    if (!entry.name.startsWith(PHOTO_DIRECTORY)) continue
    const fileName = entry.name.slice(PHOTO_DIRECTORY.length)
    const dot = fileName.lastIndexOf('.')
    const id = dot > 0 ? fileName.slice(0, dot) : fileName
    const extension = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
    if (id.length === 0) continue
    photos.set(
      id,
      new Blob([entry.bytes as unknown as BlobPart], {
        type: TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream',
      }),
    )
  }

  return { json: new TextDecoder().decode(jsonEntry.bytes), photos, hadPhotos: photos.size > 0 }
}

/**
 * Salva il backup sul disco dell'utente.
 *
 * Niente rete: si costruisce un Blob in memoria, si crea un object URL e lo
 * si dà a un `<a download>`. È l'unico modo di "scaricare" un file in un'app
 * che non ha un server (CLAUDE.md, Vincoli non negoziabili).
 */
export function downloadBackup(blob: Blob, filename = BACKUP_FILENAME): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoca differita: alcuni browser leggono l'URL dopo che il click è
  // tornato, e revocarlo subito produrrebbe un file vuoto.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
