import { create } from 'zustand'
import { isKnownCountryCode } from '../data/countries/countries'
import {
  StorageUnavailableError,
  addManuallyMarked,
  clearManuallyMarked,
  clearPhotos,
  clearVisits,
  loadManuallyMarked,
  loadVisits,
  removeManuallyMarked,
  removeOrphanPhotos,
  removeVisit as removeVisitFromStorage,
  removeVisitsForCountry,
  replaceManuallyMarked,
  replaceVisits,
  requestPersistentStorage,
  savePhoto,
  saveVisit,
} from '../services/storage'
import { newId } from '../utils/id'
import { isValidVisitDate, parseTravelData } from '../utils/travelDataSchema'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'
import type { TravelData, TravelDataExport, Visit } from '../types'

export type HydrationStatus = 'idle' | 'hydrating' | 'ready'
export type StorageStatus = 'unknown' | 'available' | 'unavailable'

/** Dati di un nuovo viaggio: l'id lo genera lo store. */
export type NewVisit = Omit<Visit, 'id'> & { id?: string }

export interface ImportOutcome {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export interface TravelStore extends TravelData {
  /** Flag di loading dell'idratazione iniziale. */
  status: HydrationStatus
  /** Stato dell'archiviazione locale. `unavailable` = modalità solo memoria. */
  storage: StorageStatus
  /** Messaggio comprensibile per l'utente. Mai uno stack trace. */
  storageMessage: string | null
  /** Ultimo errore di un'operazione puntuale. */
  lastError: string | null

  hydrate: () => Promise<void>
  markVisited: (code: string) => Promise<void>
  unmarkVisited: (code: string) => Promise<void>
  toggleVisited: (code: string) => Promise<void>
  forgetCountry: (code: string) => Promise<void>
  /** `photo` viene salvata come Blob e collegata al viaggio via `photoId`. */
  addVisit: (input: NewVisit, photo?: Blob | null) => Promise<Visit | null>
  removeVisit: (id: string) => Promise<void>
  importData: (raw: unknown) => Promise<ImportOutcome>
  exportData: () => TravelDataExport
  resetData: () => Promise<void>
  clearLastError: () => void
}

const STORAGE_UNAVAILABLE_MESSAGE =
  'Local storage is unavailable — this happens in private browsing. ' +
  'You can still browse and edit, but changes will be lost when you close this tab.'

const GENERIC_WRITE_ERROR = 'Could not save your change. Please try again.'

type PersistOutcome = 'saved' | 'not-persisted' | 'failed'

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Snapshot dei soli campi persistiti. */
function snapshot(state: TravelData): TravelData {
  return { manuallyMarked: state.manuallyMarked, visits: state.visits }
}

export const useTravelStore = create<TravelStore>((set, get) => {
  /**
   * Esegue una scrittura su IndexedDB traducendo gli errori in stato dell'UI.
   * - `saved`: tutto ok.
   * - `not-persisted`: storage assente. L'app resta usabile in memoria e
   *   mostra l'avviso: la modifica NON viene annullata.
   * - `failed`: errore inatteso. Il chiamante deve fare rollback.
   */
  async function persist(action: () => Promise<unknown>): Promise<PersistOutcome> {
    try {
      await action()
      return 'saved'
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        set({ storage: 'unavailable', storageMessage: STORAGE_UNAVAILABLE_MESSAGE })
        return 'not-persisted'
      }
      set({ lastError: GENERIC_WRITE_ERROR })
      return 'failed'
    }
  }

  return {
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,

    hydrate: async () => {
      if (get().status !== 'idle') return
      set({ status: 'hydrating' })

      try {
        const [manuallyMarked, visits] = await Promise.all([loadManuallyMarked(), loadVisits()])
        set({
          manuallyMarked,
          visits,
          status: 'ready',
          storage: 'available',
          storageMessage: null,
        })
        // Senza questo iOS Safari può evictare IndexedDB dopo ~7 giorni.
        void requestPersistentStorage()
      } catch (error) {
        const unavailable = error instanceof StorageUnavailableError
        set({
          manuallyMarked: [],
          visits: [],
          status: 'ready',
          storage: 'unavailable',
          storageMessage: unavailable
            ? STORAGE_UNAVAILABLE_MESSAGE
            : 'Could not read your saved data. The app starts empty for this session.',
        })
      }
    },

    markVisited: async (code) => {
      const normalized = normalizeCode(code)
      if (!isKnownCountryCode(normalized)) {
        set({ lastError: `Unknown country code: ${normalized}.` })
        return
      }
      if (get().manuallyMarked.includes(normalized)) return

      const previous = get().manuallyMarked
      set({ manuallyMarked: [...previous, normalized].sort(), lastError: null })

      if ((await persist(() => addManuallyMarked(normalized))) === 'failed') {
        set({ manuallyMarked: previous })
      }
    },

    /**
     * Toglie SOLO il marcatore manuale: i viaggi non vengono toccati.
     * Di conseguenza un Paese con viaggi registrati resta `isVisited`, perché
     * il selettore deriva da entrambe le fonti. Non è una svista.
     *
     * Vedi CLAUDE.md, "Decisioni prese" -> Rimozione dello stato visitato:
     * dalla fase 4 il click sul globo apre CountryDetails e non rimuove mai
     * nulla; lo stato si toglie dal bottone dentro CountryDetails, che chiede
     * conferma elencando i viaggi da eliminare. Quella logica sta nella UI,
     * non qui: lo store resta un'operazione elementare e prevedibile.
     */
    unmarkVisited: async (code) => {
      const normalized = normalizeCode(code)
      const previous = get().manuallyMarked
      if (!previous.includes(normalized)) return

      set({ manuallyMarked: previous.filter((item) => item !== normalized), lastError: null })

      if ((await persist(() => removeManuallyMarked(normalized))) === 'failed') {
        set({ manuallyMarked: previous })
      }
    },

    /**
     * Aggiunge o toglie il marcatore manuale.
     *
     * Gesto provvisorio: è il click sul globo della fase 2. Dalla fase 4 il
     * click aprirà CountryDetails e questa azione non sarà più collegata al
     * globo (vedi CLAUDE.md, "Decisioni prese").
     */
    toggleVisited: async (code) => {
      const normalized = normalizeCode(code)
      if (get().manuallyMarked.includes(normalized)) {
        await get().unmarkVisited(normalized)
      } else {
        await get().markVisited(normalized)
      }
    },

    /**
     * Rende un Paese non visitato per davvero: toglie il marcatore manuale
     * E cancella i suoi viaggi, perché `isVisited` deriva da entrambi.
     *
     * È l'operazione distruttiva dietro la modal di conferma di
     * CountryDetails (CLAUDE.md, "Decisioni prese"). Non va mai invocata
     * senza aver prima mostrato all'utente quanti viaggi sta eliminando:
     * `unmarkVisited` resta l'operazione elementare e non distruttiva.
     */
    forgetCountry: async (code) => {
      const normalized = normalizeCode(code)
      const previous = snapshot(get())
      const hadMark = previous.manuallyMarked.includes(normalized)
      const doomed = previous.visits.filter((visit) => visit.countryCode === normalized)
      if (!hadMark && doomed.length === 0) return

      set({
        manuallyMarked: previous.manuallyMarked.filter((item) => item !== normalized),
        visits: previous.visits.filter((visit) => visit.countryCode !== normalized),
        lastError: null,
      })

      const outcome = await persist(async () => {
        if (hadMark) await removeManuallyMarked(normalized)
        if (doomed.length > 0) {
          await removeVisitsForCountry(normalized)
          // Le foto dei viaggi appena eliminati non devono restare a occupare quota.
          await removeOrphanPhotos()
        }
      })

      if (outcome === 'failed') {
        set({ manuallyMarked: previous.manuallyMarked, visits: previous.visits })
      }
    },

    addVisit: async (input, photo) => {
      const countryCode = normalizeCode(input.countryCode)
      if (!isKnownCountryCode(countryCode)) {
        set({ lastError: `Unknown country code: ${countryCode}.` })
        return null
      }
      if (!isValidVisitDate(input.date)) {
        set({ lastError: 'Invalid trip date: use the YYYY-MM-DD format.' })
        return null
      }

      // La foto va salvata PRIMA del viaggio: serve il suo id per collegarla.
      // Se l'archiviazione non c'è, il viaggio si aggiunge lo stesso senza
      // foto e l'avviso spiega perché.
      let photoId = input.photoId
      if (photo) {
        try {
          photoId = await savePhoto(photo)
        } catch (error) {
          if (error instanceof StorageUnavailableError) {
            set({ storage: 'unavailable', storageMessage: STORAGE_UNAVAILABLE_MESSAGE })
            photoId = undefined
          } else {
            set({ lastError: 'Could not save the photo. The trip was not added.' })
            return null
          }
        }
      }

      const visit: Visit = { ...input, id: input.id ?? newId(), countryCode }
      if (photoId === undefined) delete visit.photoId
      else visit.photoId = photoId

      const previous = get().visits
      set({ visits: [visit, ...previous], lastError: null })

      if ((await persist(() => saveVisit(visit))) === 'failed') {
        set({ visits: previous })
        return null
      }
      return visit
    },

    removeVisit: async (id) => {
      const previous = get().visits
      const visit = previous.find((item) => item.id === id)
      if (!visit) return

      set({ visits: previous.filter((item) => item.id !== id), lastError: null })

      const outcome = await persist(async () => {
        await removeVisitFromStorage(id)
        // La foto collegata non deve restare a occupare quota.
        if (visit.photoId) await removeOrphanPhotos()
      })
      if (outcome === 'failed') {
        set({ visits: previous })
      }
    },

    importData: async (raw) => {
      const parsed = parseTravelData(raw)
      if (!parsed.ok) {
        set({ lastError: parsed.errors[0] ?? 'Invalid file.' })
        return { ok: false, errors: parsed.errors, warnings: [] }
      }

      const previous = snapshot(get())
      set({
        manuallyMarked: parsed.data.manuallyMarked,
        visits: parsed.data.visits,
        lastError: null,
      })

      const outcome = await persist(async () => {
        await replaceManuallyMarked(parsed.data.manuallyMarked)
        await replaceVisits(parsed.data.visits)
        await removeOrphanPhotos()
      })

      if (outcome === 'failed') {
        set({ manuallyMarked: previous.manuallyMarked, visits: previous.visits })
        return {
          ok: false,
          errors: ['Import failed: your previous data was kept.'],
          warnings: parsed.warnings,
        }
      }

      return { ok: true, errors: [], warnings: parsed.warnings }
    },

    exportData: () => {
      const { manuallyMarked, visits } = get()
      return {
        formatVersion: TRAVEL_DATA_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        manuallyMarked,
        visits,
      }
    },

    resetData: async () => {
      const previous = snapshot(get())
      set({ manuallyMarked: [], visits: [], lastError: null })

      const outcome = await persist(async () => {
        await clearManuallyMarked()
        await clearVisits()
        await clearPhotos()
      })
      if (outcome === 'failed') {
        set({ manuallyMarked: previous.manuallyMarked, visits: previous.visits })
      }
    },

    clearLastError: () => set({ lastError: null }),
  }
})

/** Stato iniziale, per i test e per `resetData` in memoria. */
export const initialTravelState: TravelData = { manuallyMarked: [], visits: [] }
