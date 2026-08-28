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
  replaceManuallyMarked,
  replaceVisits,
  requestPersistentStorage,
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
  addVisit: (input: NewVisit) => Promise<Visit | null>
  removeVisit: (id: string) => Promise<void>
  importData: (raw: unknown) => Promise<ImportOutcome>
  exportData: () => TravelDataExport
  resetData: () => Promise<void>
  clearLastError: () => void
}

const STORAGE_UNAVAILABLE_MESSAGE =
  'Archiviazione locale non disponibile (succede in navigazione privata). ' +
  'Puoi consultare e modificare i dati, ma le modifiche andranno perse chiudendo la scheda.'

const GENERIC_WRITE_ERROR = 'Non è stato possibile salvare la modifica. Riprova.'

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
            : 'Non è stato possibile leggere i dati salvati. L’app riparte da zero in questa sessione.',
        })
      }
    },

    markVisited: async (code) => {
      const normalized = normalizeCode(code)
      if (!isKnownCountryCode(normalized)) {
        set({ lastError: `Codice Paese non riconosciuto: ${normalized}.` })
        return
      }
      if (get().manuallyMarked.includes(normalized)) return

      const previous = get().manuallyMarked
      set({ manuallyMarked: [...previous, normalized].sort(), lastError: null })

      if ((await persist(() => addManuallyMarked(normalized))) === 'failed') {
        set({ manuallyMarked: previous })
      }
    },

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
     * Attenzione: un Paese con viaggi registrati resta "visitato" anche senza
     * marcatore, perché `isVisited` è derivato dalle due fonti.
     */
    toggleVisited: async (code) => {
      const normalized = normalizeCode(code)
      if (get().manuallyMarked.includes(normalized)) {
        await get().unmarkVisited(normalized)
      } else {
        await get().markVisited(normalized)
      }
    },

    addVisit: async (input) => {
      const countryCode = normalizeCode(input.countryCode)
      if (!isKnownCountryCode(countryCode)) {
        set({ lastError: `Codice Paese non riconosciuto: ${countryCode}.` })
        return null
      }
      if (!isValidVisitDate(input.date)) {
        set({ lastError: 'Data del viaggio non valida: usa il formato AAAA-MM-GG.' })
        return null
      }

      const visit: Visit = { ...input, id: input.id ?? newId(), countryCode }
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
        set({ lastError: parsed.errors[0] ?? 'File non valido.' })
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
          errors: ['Import non riuscito: i dati precedenti sono stati mantenuti.'],
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
