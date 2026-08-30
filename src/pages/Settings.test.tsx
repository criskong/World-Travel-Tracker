// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { useTravelStore } from '../store/travelStore'
import { loadPhoto } from '../services/storage'
import { closeDatabase } from '../services/storage/db'
import { BACKUP_FILENAME } from '../utils/backupFile'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'

/**
 * La pagina che può distruggere dei dati.
 *
 * Il controllo che conta di più non è che l'import funzioni: è che un file
 * sbagliato NON scriva niente, e che un import valido dica cosa sta per fare
 * prima di farlo.
 */

/** jsdom non implementa gli object URL: qui servono solo a non far lanciare. */
const createdUrls: string[] = []
const revokedUrls: string[] = []

beforeEach(async () => {
  createdUrls.length = 0
  revokedUrls.length = 0

  URL.createObjectURL = vi.fn((_blob: Blob) => {
    const url = `blob:test/${createdUrls.length}`
    createdUrls.push(url)
    return url
  }) as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn((url: string) => {
    revokedUrls.push(url)
  })

  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
  })
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await closeDatabase()
})

function backupFile(contents: unknown, name = 'backup.json'): File {
  const text = typeof contents === 'string' ? contents : JSON.stringify(contents)
  const file = new File([text], name, { type: 'application/json' })
  // jsdom non porta `Blob.text()` in tutte le versioni: lo forniamo noi, così
  // il test misura la pagina e non le lacune dell'ambiente.
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', { value: async () => text })
  }
  return file
}

function pickFile(file: File): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('selettore del file non trovato')
  fireEvent.change(input, { target: { files: [file] } })
}

function currentData() {
  const { manuallyMarked, visits } = useTravelStore.getState()
  return { manuallyMarked, visits }
}

const VALID_BACKUP = {
  formatVersion: TRAVEL_DATA_FORMAT_VERSION,
  exportedAt: '2024-05-01T10:00:00.000Z',
  manuallyMarked: ['FR', 'ES'],
  visits: [{ id: 'imported-1', countryCode: 'PT', date: '2024-03-02' }],
}

describe('Export', () => {
  it("dice che le foto non entrano nel backup PRIMA del bottone", () => {
    render(<Settings />)
    const section = screen.getByRole('region', { name: 'Export a backup' })

    const notice = within(section).getByText(/Photos are not included/i)
    const button = within(section).getByRole('button', { name: /Export backup/i })

    expect(notice).toBeDefined()
    // `compareDocumentPosition` con FOLLOWING: l'avviso precede il bottone.
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('non si puo esportare uno stato vuoto', () => {
    render(<Settings />)
    const button = screen.getByRole('button', { name: /Export backup/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('scarica un file col nome previsto e con la versione di schema', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Settings />)

    const clicked: { download: string; href: string }[] = []
    const realClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href })
    }

    try {
      fireEvent.click(screen.getByRole('button', { name: /Export backup/i }))
    } finally {
      HTMLAnchorElement.prototype.click = realClick
    }

    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.download).toBe(BACKUP_FILENAME)
    expect(createdUrls).toHaveLength(1)

    const payload = useTravelStore.getState().exportData()
    expect(payload.formatVersion).toBe(TRAVEL_DATA_FORMAT_VERSION)
    expect(payload.manuallyMarked).toEqual(['IT'])
  })

  it('conferma il salvataggio solo dopo il click', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Settings />)

    expect(screen.queryByText(/Backup saved/i)).toBeNull()

    const realClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      fireEvent.click(screen.getByRole('button', { name: /Export backup/i }))
    } finally {
      HTMLAnchorElement.prototype.click = realClick
    }

    expect(await screen.findByText(/Backup saved/i)).toBeDefined()
  })
})

describe('Import', () => {
  it("avvisa che l'import sostituisce, prima di poter scegliere un file", () => {
    render(<Settings />)
    const section = screen.getByRole('region', { name: 'Import a backup' })

    const notice = within(section).getByText(/Importing replaces everything/i)
    expect(within(section).getByText(/discarded, not merged/i)).toBeDefined()

    const input = section.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    expect(notice.compareDocumentPosition(input!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['un file che non e JSON', 'questo non e un backup'],
    ['JSON troncato', '{"manuallyMarked": ['],
    ['un JSON che non e un oggetto', '[]'],
    ['un file di un altra app', JSON.stringify({ version: 2, places: [] })],
  ])('rifiuta %s senza toccare i dati', async (_label, contents) => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-01-01' })
    const before = currentData()

    render(<Settings />)
    pickFile(backupFile(contents))

    expect(await screen.findByText(/This file was not imported/i)).toBeDefined()
    expect(currentData()).toEqual(before)
    // Nessuna conferma: non si arriva nemmeno a chiedere.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('rifiuta un file di una versione di formato futura', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Settings />)

    pickFile(backupFile({ formatVersion: 99, manuallyMarked: [], visits: [] }))

    expect(await screen.findByText(/This file was not imported/i)).toBeDefined()
    expect(screen.getByText(/newer version of the app/i)).toBeDefined()
    expect(currentData().manuallyMarked).toEqual(['IT'])
  })

  it('un file valido chiede conferma e non scrive niente finche non si conferma', async () => {
    await useTravelStore.getState().markVisited('IT')
    const before = currentData()

    render(<Settings />)
    pickFile(backupFile(VALID_BACKUP))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Replace all your data\?/i)).toBeDefined()
    expect(within(dialog).getByText(/2 countries/i)).toBeDefined()
    expect(within(dialog).getByText(/cannot be recovered/i)).toBeDefined()

    // Ancora niente scritto.
    expect(currentData()).toEqual(before)
  })

  it('annullando la conferma i dati restano quelli di prima', async () => {
    await useTravelStore.getState().markVisited('IT')
    const before = currentData()

    render(<Settings />)
    pickFile(backupFile(VALID_BACKUP))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(currentData()).toEqual(before)
  })

  it('confermando sostituisce i dati, non li fonde', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-01-01' })

    render(<Settings />)
    pickFile(backupFile(VALID_BACKUP))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Replace my data/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const after = currentData()
    expect(after.manuallyMarked).toEqual(['ES', 'FR'])
    expect(after.visits.map((visit) => visit.countryCode)).toEqual(['PT'])
    // La fusione avrebbe lasciato IT e il viaggio in JP.
    expect(after.manuallyMarked).not.toContain('IT')
    expect(after.visits.some((visit) => visit.countryCode === 'JP')).toBe(false)

    expect(await screen.findByText(/Imported 2 countries and 1 trip/i)).toBeDefined()
  })

  it('segnala le voci scartate ma importa il resto', async () => {
    render(<Settings />)
    pickFile(
      backupFile({
        formatVersion: 1,
        manuallyMarked: ['FR', 'XX'],
        visits: [{ id: 'ok', countryCode: 'ES', date: '2024-01-01' }],
      }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/unknown ISO code/i)).toBeDefined()
    fireEvent.click(within(dialog).getByRole('button', { name: /Replace my data/i }))

    await waitFor(() => expect(currentData().manuallyMarked).toEqual(['FR']))
  })
})

describe('Reset', () => {
  it('non si puo resettare uno stato gia vuoto', () => {
    render(<Settings />)
    const button = screen.getByRole('button', { name: /Reset all data/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('chiede conferma prima di cancellare', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: /Reset all data/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Erase everything\?/i)).toBeDefined()
    expect(currentData().manuallyMarked).toEqual(['IT'])
  })

  it('annullando non cancella niente', async () => {
    await useTravelStore.getState().markVisited('IT')
    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: /Reset all data/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(currentData().manuallyMarked).toEqual(['IT'])
  })

  it('confermando svuota tutto, foto comprese', async () => {
    await useTravelStore.getState().markVisited('IT')
    const visit = await useTravelStore
      .getState()
      .addVisit({ countryCode: 'JP', date: '2024-01-01' }, new Blob(['ph'], { type: 'image/jpeg' }))
    const photoId = visit?.photoId

    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Reset all data/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Erase everything/i }))

    await waitFor(() => expect(currentData()).toEqual({ manuallyMarked: [], visits: [] }))
    expect(await screen.findByText(/Everything was erased/i)).toBeDefined()

    if (photoId !== undefined) {
      expect(await loadPhoto(photoId)).toBeUndefined()
    }
  })

  it('dice quanti viaggi e quante foto sta per cancellare', async () => {
    await useTravelStore.getState().markVisited('IT')
    await useTravelStore.getState().addVisit({ countryCode: 'JP', date: '2024-01-01' })
    await useTravelStore.getState().addVisit({ countryCode: 'FR', date: '2024-02-01' })

    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: /Reset all data/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/1 country marked, 2 trips/i)).toBeDefined()
  })
})
