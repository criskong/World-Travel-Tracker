/**
 * Lettura e scrittura di archivi ZIP, senza dipendenze.
 *
 * Serve al backup: le foto sono binarie e in un JSON ci entrerebbero solo in
 * base64, che costa il 33% in più e obbliga a tenere l'intero archivio in
 * memoria come una sola stringa. In uno ZIP restano file veri, apribili con
 * un doppio clic anche senza questa app.
 *
 * Si usa il metodo "stored" (nessuna compressione): le foto sono già JPEG o
 * PNG, comprimerle una seconda volta guadagnerebbe percentuali e costerebbe
 * tempo. Il JSON dentro l'archivio è piccolo.
 *
 * Limiti dichiarati: niente Zip64, quindi fino a 65.535 file e 4 GB. Un
 * backup personale non ci arriva, e se ci arrivasse `createZip` lo direbbe
 * invece di produrre un archivio corrotto.
 */

export interface ZipEntry {
  /** Percorso dentro l'archivio, con `/` come separatore. */
  name: string
  bytes: Uint8Array
}

const MAX_ENTRIES = 0xffff
const MAX_BYTES = 0xffffffff

const SIGNATURE_LOCAL = 0x04034b50
const SIGNATURE_CENTRAL = 0x02014b50
const SIGNATURE_END = 0x06054b50

/** Tabella CRC-32, la stessa che usa lo ZIP e che usa il PNG. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = -1
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

/** Errore comprensibile: chi chiama lo traduce, non lo mostra così com'è. */
export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

// --- Scrittura --------------------------------------------------------------

export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length > MAX_ENTRIES) {
    throw new ZipError(`troppi file nell'archivio: ${entries.length}`)
  }

  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const checksum = crc32(entry.bytes)
    const size = entry.bytes.length
    if (offset + size > MAX_BYTES) {
      throw new ZipError('archivio troppo grande: oltre 4 GB')
    }

    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, SIGNATURE_LOCAL, true)
    localView.setUint16(4, 20, true) // versione minima per estrarre
    localView.setUint16(6, 0x0800, true) // flag: nomi in UTF-8
    localView.setUint16(8, 0, true) // metodo: stored
    localView.setUint16(10, 0, true) // ora
    localView.setUint16(12, 0x21, true) // data: 1980-01-01, non ci interessa
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, size, true)
    localView.setUint32(22, size, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true) // campo extra assente
    local.set(name, 30)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, SIGNATURE_CENTRAL, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0x21, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, size, true)
    centralView.setUint32(24, size, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local, entry.bytes)
    centrals.push(central)
    offset += local.length + size
  }

  const centralSize = centrals.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, SIGNATURE_END, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  return concat([...locals, ...centrals, end])
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

// --- Lettura ----------------------------------------------------------------

/** `true` se i primi byte sono la firma di uno ZIP. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06)
  )
}

/**
 * Legge un archivio partendo dalla directory centrale, come prescrive il
 * formato: e l'unico indice affidabile, perche le intestazioni locali possono
 * rimandare i propri campi a un descrittore che segue i dati.
 */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // La coda ha lunghezza variabile per via del commento: si cerca all'indietro.
  let end = -1
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 22 - 0xffff; i -= 1) {
    if (view.getUint32(i, true) === SIGNATURE_END) {
      end = i
      break
    }
  }
  if (end < 0) throw new ZipError('non e un archivio ZIP valido')

  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i += 1) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== SIGNATURE_CENTRAL) {
      throw new ZipError('archivio ZIP danneggiato')
    }
    const method = view.getUint16(at + 10, true)
    const size = view.getUint32(at + 24, true)
    const nameLength = view.getUint16(at + 28, true)
    const extraLength = view.getUint16(at + 30, true)
    const commentLength = view.getUint16(at + 32, true)
    const localOffset = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))

    if (method !== 0) {
      // Scriviamo solo archivi "stored"; uno compresso non lo abbiamo fatto noi.
      throw new ZipError(`file compresso non supportato: ${name}`)
    }

    if (view.getUint32(localOffset, true) !== SIGNATURE_LOCAL) {
      throw new ZipError('archivio ZIP danneggiato')
    }
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + localNameLength + localExtraLength
    if (start + size > bytes.length) throw new ZipError('archivio ZIP troncato')

    entries.push({ name, bytes: bytes.slice(start, start + size) })
    at += 46 + nameLength + extraLength + commentLength
  }

  return entries
}
