// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AddVisitForm } from './AddVisitForm'
import { useTravelStore } from '../../store/travelStore'
import { closeDatabase } from '../../services/storage/db'
import { MAX_PHOTO_BYTES } from '../../utils/photoValidation'

/**
 * Il form è il punto in cui entrano i Blob delle foto: qui si verificano sia
 * la validazione della dimensione sia il ciclo di vita degli object URL
 * dell'anteprima, che è dove un leak farebbe davvero danno.
 */

const created: string[] = []
const revoked: string[] = []

/** File finto con una dimensione arbitraria: creare 6 MB veri sarebbe assurdo. */
function fileOfSize(bytes: number, type = 'image/jpeg'): File {
  const file = new File(['x'], 'photo.jpg', { type })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

/**
 * Simula la scelta di un file come fa il browser, non come fa comodo al test:
 * `input.files` e una FileList VIVA, legata al campo, e azzerare `input.value`
 * la vuota. Un doppio con un array fisso qui ha gia nascosto un bug in cui il
 * form svuotava il campo prima di leggere i file, e non ne caricava nessuno.
 */
function selectFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  // Lo STESSO oggetto, svuotato sul posto: e cosi che si comporta la FileList.
  const selected: File[] = [file]
  Object.defineProperty(input, 'files', { get: () => selected, configurable: true })
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => proto.get!.call(input) as string,
    set: (next: string) => {
      if (next === '') selected.length = 0
      proto.set!.call(input, next)
    },
  })
  fireEvent.change(input)
}

beforeEach(async () => {
  created.length = 0
  revoked.length = 0
  let counter = 0
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${counter++}`
    created.push(url)
    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url)
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
  await closeDatabase()
})

function renderForm() {
  const onDone = vi.fn()
  render(<AddVisitForm countryCode="JP" onDone={onDone} onCancel={vi.fn()} />)
  return { onDone }
}

describe('AddVisitForm', () => {
  it('preseleziona il Paese e richiede solo la data', () => {
    renderForm()

    expect((screen.getByLabelText(/Country/) as HTMLSelectElement).value).toBe('JP')
    expect((screen.getByLabelText(/Date/) as HTMLInputElement).required).toBe(true)
    expect((screen.getByLabelText(/City/) as HTMLInputElement).required).toBe(false)
    expect((screen.getByLabelText(/Note/) as HTMLTextAreaElement).required).toBe(false)
  })

  it('salva un viaggio con i soli campi compilati', async () => {
    const { onDone } = renderForm()

    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: '2024-05-01' } })
    fireEvent.change(screen.getByLabelText(/City/), { target: { value: '  Kyoto  ' } })
    fireEvent.submit(screen.getByRole('button', { name: /Save trip/ }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())

    const [visit] = useTravelStore.getState().visits
    expect(visit).toMatchObject({ countryCode: 'JP', date: '2024-05-01', city: 'Kyoto' })
    // I campi vuoti non finiscono nel record.
    expect(visit).not.toHaveProperty('note')
  })

  it('rifiuta una foto troppo grande con un messaggio comprensibile', async () => {
    renderForm()

    selectFile(fileOfSize(MAX_PHOTO_BYTES + 1))

    const error = await screen.findByRole('alert')
    expect(error.textContent).toContain('5.0 MB')
    expect(error.textContent).not.toContain('Error')
    // La foto scartata non produce nemmeno l'anteprima.
    expect(created).toHaveLength(0)
  })

  it('rifiuta un file che non è un immagine', async () => {
    renderForm()

    selectFile(fileOfSize(1000, 'application/pdf'))

    expect((await screen.findByRole('alert')).textContent).toContain('not an image')
    expect(created).toHaveLength(0)
  })

  it("mostra l'anteprima di una foto valida", async () => {
    renderForm()

    selectFile(fileOfSize(500_000))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("revoca l'object URL dell'anteprima allo smontaggio", async () => {
    const { unmount } = render(
      <AddVisitForm countryCode="JP" onDone={vi.fn()} onCancel={vi.fn()} />,
    )

    selectFile(fileOfSize(500_000))
    await waitFor(() => expect(created).toHaveLength(1))
    expect(revoked).toHaveLength(0)

    unmount()

    expect(revoked).toEqual(created)
  })

  it("revoca le anteprime precedenti quando si aggiunge una foto", async () => {
    renderForm()

    selectFile(fileOfSize(100_000))
    await waitFor(() => expect(created).toHaveLength(1))
    const first = created[0]!

    // La seconda foto rifa la lista: l'URL della prima va revocato e ricreato.
    selectFile(fileOfSize(200_000))
    await waitFor(() => expect(created.length).toBeGreaterThan(1))

    expect(revoked).toContain(first)
  })

  it("revoca l'anteprima quando si rimuove la foto", async () => {
    renderForm()

    selectFile(fileOfSize(100_000))
    await waitFor(() => expect(created).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))

    await waitFor(() => expect(revoked).toEqual(expect.arrayContaining(created)))
  })

  it('accetta piu foto per lo stesso viaggio', async () => {
    const { onDone } = renderForm()

    selectFile(fileOfSize(100_000))
    await waitFor(() => expect(created).toHaveLength(1))
    selectFile(fileOfSize(120_000))
    // Le anteprime hanno alt vuoto (sono decorative): si contano dai loro
    // bottoni di rimozione, che invece un nome accessibile ce l'hanno.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Remove photo/ })).toHaveLength(2),
    )

    fireEvent.submit(screen.getByRole('button', { name: 'Save trip' }).closest('form')!)
    await waitFor(() => expect(onDone).toHaveBeenCalled())

    const [visit] = useTravelStore.getState().visits
    expect(visit?.photoIds).toHaveLength(2)
  })

  /**
   * Qui si verifica solo che la foto venga scritta e collegata al viaggio.
   * Che torni indietro come Blob NON si può verificare in jsdom: il suo Blob
   * non è quello nativo di Node, e `structuredClone` — che fake-indexeddb usa
   * per serializzare — lo degrada a `{}`. La prova del round-trip vero sta in
   * `services/storage/storageLayer.test.ts`, che gira in ambiente node.
   */
  it('salva la foto e la collega al viaggio', async () => {
    const { onDone } = renderForm()

    selectFile(fileOfSize(120_000))
    await waitFor(() => expect(created).toHaveLength(1))

    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: '2024-05-02' } })
    fireEvent.submit(screen.getByRole('button', { name: /Save trip/ }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())

    const [visit] = useTravelStore.getState().visits
    expect(visit?.photoIds).toHaveLength(1)

    const { loadPhoto } = await import('../../services/storage')
    expect(await loadPhoto(visit!.photoIds![0]!)).toBeDefined()
  })

  it('senza foto il viaggio non ha photoIds', async () => {
    const { onDone } = renderForm()

    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: '2024-05-03' } })
    fireEvent.submit(screen.getByRole('button', { name: /Save trip/ }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(useTravelStore.getState().visits[0]).not.toHaveProperty('photoId')
  })
})
