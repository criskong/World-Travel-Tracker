import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import {
  clearManuallyMarked,
  clearPhotos,
  clearVisits,
  loadPhoto,
  removeOrphanPhotos,
  removePhoto,
  savePhoto,
  saveVisit,
} from './index'

const SRC_ROOT = resolve(process.cwd(), 'src')
const STORAGE_DIR = join(SRC_ROOT, 'services', 'storage')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

describe("confine del layer di storage", () => {
  it('solo i moduli dentro services/storage importano db.ts', () => {
    const offenders = sourceFiles(SRC_ROOT)
      .filter((file) => !file.startsWith(STORAGE_DIR + sep))
      // I test possono raggiungere db.ts per chiudere la connessione.
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) => /from\s+'[^']*\/db'/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file))

    expect(offenders).toEqual([])
  })
})

describe('photos', () => {
  it('salva e rilegge un Blob, non una stringa base64', async () => {
    await clearPhotos()
    const id = await savePhoto(new Blob(['ciao'], { type: 'text/plain' }))
    const blob = await loadPhoto(id)

    expect(blob).toBeInstanceOf(Blob)
    expect(await blob!.text()).toBe('ciao')

    await removePhoto(id)
    expect(await loadPhoto(id)).toBeUndefined()
  })

  it('elimina solo le foto non più referenziate da un viaggio', async () => {
    await clearPhotos()
    await clearVisits()
    await clearManuallyMarked()

    const kept = await savePhoto(new Blob(['tenuta']))
    const orphan = await savePhoto(new Blob(['orfana']))
    await saveVisit({ id: 'v1', countryCode: 'JP', date: '2024-05-01', photoId: kept })

    expect(await removeOrphanPhotos()).toBe(1)
    expect(await loadPhoto(kept)).toBeDefined()
    expect(await loadPhoto(orphan)).toBeUndefined()

    await clearVisits()
    await clearPhotos()
  })
})
