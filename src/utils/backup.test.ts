import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ZipError, createZip, crc32, looksLikeZip, readZip } from './zip'
import { BACKUP_JSON_ENTRY, buildBackupZip, readBackupFile } from './backupFile'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'
import { loadPhoto } from '../services/storage'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'

/**
 * Il backup, dal formato ZIP scritto a mano fino al giro completo
 * esporta -> reimporta con le foto dentro.
 *
 * Girano in ambiente node perche servono `Blob` e `structuredClone` veri:
 * quelli di jsdom degradano i Blob a `{}` passando da fake-indexeddb.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

beforeEach(async () => {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
    language: 'en',
  })
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  await closeDatabase()
})

describe('crc32', () => {
  /** Valori noti: se questi sbagliano, ogni archivio prodotto e corrotto. */
  it('corrisponde ai valori di riferimento', () => {
    expect(crc32(encoder.encode(''))).toBe(0)
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(encoder.encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('zip', () => {
  it('riconosce la firma di un archivio', () => {
    const zip = createZip([{ name: 'a.txt', bytes: encoder.encode('ciao') }])
    expect(looksLikeZip(zip)).toBe(true)
    expect(looksLikeZip(encoder.encode('{"non":"uno zip"}'))).toBe(false)
    expect(looksLikeZip(new Uint8Array([1, 2]))).toBe(false)
  })

  it('scrive e rilegge i file, byte per byte', () => {
    const entries = [
      { name: 'backup.json', bytes: encoder.encode('{"a":1}') },
      { name: 'photos/abc.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x42]) },
    ]
    const round = readZip(createZip(entries))

    expect(round.map((entry) => entry.name)).toEqual(['backup.json', 'photos/abc.jpg'])
    expect(decoder.decode(round[0]!.bytes)).toBe('{"a":1}')
    expect([...round[1]!.bytes]).toEqual([0xff, 0xd8, 0xff, 0x00, 0x42])
  })

  it('regge un archivio vuoto', () => {
    expect(readZip(createZip([]))).toEqual([])
  })

  it('regge nomi con caratteri non ASCII', () => {
    const round = readZip(createZip([{ name: 'foto/città.jpg', bytes: encoder.encode('x') }]))
    expect(round[0]?.name).toBe('foto/città.jpg')
  })

  it('regge un file grande senza corromperlo', () => {
    const big = new Uint8Array(2_000_000).map((_, i) => i % 251)
    const round = readZip(createZip([{ name: 'big.bin', bytes: big }]))
    expect(round[0]?.bytes.length).toBe(big.length)
    expect(crc32(round[0]!.bytes)).toBe(crc32(big))
  })

  it('rifiuta qualcosa che non e un archivio, con un errore riconoscibile', () => {
    expect(() => readZip(encoder.encode('non sono uno zip'))).toThrow(ZipError)
  })

  it('rifiuta un archivio troncato', () => {
    const zip = createZip([{ name: 'a.txt', bytes: encoder.encode('ciao') }])
    expect(() => readZip(zip.slice(0, zip.length - 10))).toThrow(ZipError)
  })
})

describe('il file di backup', () => {
  const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

  function bundle() {
    return {
      data: {
        formatVersion: TRAVEL_DATA_FORMAT_VERSION,
        exportedAt: '2024-05-01T10:00:00.000Z',
        manuallyMarked: ['IT'],
        visits: [{ id: 'v1', countryCode: 'JP', date: '2024-04-02', photoIds: ['p1'] }],
      },
      photos: [{ id: 'p1', blob: new Blob([photoBytes], { type: 'image/jpeg' }) }],
    }
  }

  it('mette il JSON e le foto dentro un archivio', async () => {
    const zip = await buildBackupZip(bundle())
    const entries = readZip(new Uint8Array(await zip.arrayBuffer()))

    expect(entries.map((entry) => entry.name)).toContain(BACKUP_JSON_ENTRY)
    expect(entries.map((entry) => entry.name)).toContain('photos/p1.jpg')
    // Un LEGGIMI: chi apre l'archivio fra due anni deve capire cos'e.
    expect(entries.some((entry) => entry.name.endsWith('.txt'))).toBe(true)
  })

  /** Il motivo per cui non si e usato base64: le foto restano binarie. */
  it('le foto non vengono gonfiate', async () => {
    const zip = await buildBackupZip(bundle())
    const entries = readZip(new Uint8Array(await zip.arrayBuffer()))
    const photo = entries.find((entry) => entry.name === 'photos/p1.jpg')

    expect(photo?.bytes.length).toBe(photoBytes.length)
    expect([...photo!.bytes]).toEqual([...photoBytes])
  })

  it('si rilegge da solo', async () => {
    const zip = await buildBackupZip(bundle())
    const read = await readBackupFile(zip)

    expect(JSON.parse(read.json)).toEqual(bundle().data)
    expect(read.hadPhotos).toBe(true)
    expect(read.photos.size).toBe(1)
    expect(await read.photos.get('p1')!.arrayBuffer()).toEqual(photoBytes.buffer)
    expect(read.photos.get('p1')!.type).toBe('image/jpeg')
  })

  /** I backup esportati prima erano JSON: devono continuare a funzionare. */
  it('accetta ancora un vecchio backup in JSON', async () => {
    const legacy = JSON.stringify({ formatVersion: 1, manuallyMarked: ['IT'], visits: [] })
    const read = await readBackupFile(new Blob([legacy], { type: 'application/json' }))

    expect(read.json).toBe(legacy)
    expect(read.hadPhotos).toBe(false)
    expect(read.photos.size).toBe(0)
  })

  it('un archivio senza backup.json viene rifiutato', async () => {
    const zip = createZip([{ name: 'altro.txt', bytes: encoder.encode('niente') }])
    await expect(readBackupFile(new Blob([zip as unknown as BlobPart]))).rejects.toThrow(ZipError)
  })
})

describe('il giro completo: esporta e reimporta', () => {
  async function addTripWithPhotos(count: number) {
    const photos = Array.from(
      { length: count },
      (_, i) => new Blob([new Uint8Array([0xff, 0xd8, i])], { type: 'image/jpeg' }),
    )
    return useTravelStore
      .getState()
      .addVisit({ countryCode: 'JP', date: '2024-05-01', city: 'Kyoto' }, photos)
  }

  it('un viaggio puo avere piu foto', async () => {
    const visit = await addTripWithPhotos(3)
    expect(visit?.photoIds).toHaveLength(3)
    for (const id of visit!.photoIds!) {
      expect(await loadPhoto(id)).toBeDefined()
    }
  })

  /**
   * Il caso che conta: ripristinare su un dispositivo dove le foto NON ci
   * sono. Prima dello ZIP il backup portava solo i riferimenti, e qui le foto
   * sparivano.
   */
  it('le foto sopravvivono a un ripristino da zero', async () => {
    await useTravelStore.getState().markVisited('IT')
    const visit = await addTripWithPhotos(2)
    const ids = visit!.photoIds!

    const zip = await buildBackupZip(await useTravelStore.getState().exportBackup())

    // Come su un telefono nuovo: niente dati, niente foto.
    await useTravelStore.getState().resetData()
    expect(await loadPhoto(ids[0]!)).toBeUndefined()

    const read = await readBackupFile(zip)
    const outcome = await useTravelStore.getState().importData(JSON.parse(read.json), read.photos)

    expect(outcome.ok).toBe(true)
    const restored = useTravelStore.getState().visits[0]
    expect(restored?.photoIds).toEqual(ids)
    for (const id of ids) {
      expect(await loadPhoto(id), `la foto ${id} non e tornata`).toBeDefined()
    }
  })

  it('le foto ripristinate hanno lo stesso contenuto', async () => {
    const visit = await addTripWithPhotos(1)
    const id = visit!.photoIds![0]!
    const before = await (await loadPhoto(id))!.arrayBuffer()

    const zip = await buildBackupZip(await useTravelStore.getState().exportBackup())
    await useTravelStore.getState().resetData()

    const read = await readBackupFile(zip)
    await useTravelStore.getState().importData(JSON.parse(read.json), read.photos)

    expect(await (await loadPhoto(id))!.arrayBuffer()).toEqual(before)
  })

  it('reimportare un backup senza foto non lascia riferimenti a vuoto', async () => {
    await addTripWithPhotos(1)
    const data = useTravelStore.getState().exportData()

    await useTravelStore.getState().resetData()
    await useTravelStore.getState().importData(data)

    // I riferimenti restano — sono nel JSON — ma i Blob non ci sono: l'app
    // lo dice invece di mostrare meno foto in silenzio (`usePhotos.missing`).
    const restored = useTravelStore.getState().visits[0]
    expect(restored?.photoIds).toHaveLength(1)
    expect(await loadPhoto(restored!.photoIds![0]!)).toBeUndefined()
  })

  it('un backup vecchio con photoId singolo diventa photoIds', async () => {
    const legacy = {
      formatVersion: 1,
      manuallyMarked: [],
      visits: [{ id: 'v1', countryCode: 'JP', date: '2024-01-01', photoId: 'vecchia' }],
    }
    await useTravelStore.getState().importData(legacy)

    expect(useTravelStore.getState().visits[0]?.photoIds).toEqual(['vecchia'])
  })
})
