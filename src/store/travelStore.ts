import { create } from 'zustand'
import { isKnownCountryCode } from '../data/countries/countries'
import {
  StorageUnavailableError,
  readStoredLanguage,
  writeStoredLanguage,
  addManuallyMarked,
  clearManuallyMarked,
  clearPhotos,
  clearVisits,
  loadManuallyMarked,
  loadVisits,
  removeManuallyMarked,
  removeOrphanPhotos,
  removeVisit as removeVisitFromStorage,
  loadAllPhotos,
  removeVisitsForCountry,
  replaceManuallyMarked,
  restorePhoto,
  replaceVisits,
  requestPersistentStorage,
  savePhoto,
  saveVisit,
} from '../services/storage'
import { newId } from '../utils/id'
import type { BackupBundle } from '../utils/backupFile'
import { detectLanguage, isLanguage } from '../i18n/languages'
import type { Language } from '../i18n/languages'
import type { LocalizedMessage } from '../i18n/message'
import { isValidVisitDate, parseTravelData } from '../utils/travelDataSchema'
import { TRAVEL_DATA_FORMAT_VERSION } from '../types'
import type { TravelData, TravelDataExport, Visit } from '../types'

export type HydrationStatus = 'idle' | 'hydrating' | 'ready'
export type StorageStatus = 'unknown' | 'available' | 'unavailable'

/** Dati di un nuovo viaggio: l'id lo genera lo store. */
export type NewVisit = Omit<Visit, 'id'> & { id?: string }

/**
 * Cosa si puo cambiare di un viaggio esistente. `photoIds` sono le foto GIA
 * salvate da tenere: quelle che mancano rispetto a prima vengono eliminate.
 * Le foto nuove viaggiano a parte, come Blob, in `updateVisit`.
 */
export type VisitChanges = Omit<Visit, 'id'>

export interface ImportOutcome {
  ok: boolean
  errors: StoreMessage[]
  warnings: StoreMessage[]
}

/** Alias storico: i messaggi dello store sono . */
export type StoreMessage = LocalizedMessage

export interface TravelStore extends TravelData {
  /** Flag di loading dell'idratazione iniziale. */
  status: HydrationStatus
  /** Stato dell'archiviazione locale. `unavailable` = modalità solo memoria. */
  storage: StorageStatus
  /** Messaggio comprensibile per l'utente. Mai uno stack trace. */
  storageMessage: StoreMessage | null
  /** Ultimo errore di un'operazione puntuale. */
  lastError: StoreMessage | null
  /** Lingua dell'interfaccia. Preferenza, non dato di viaggio. */
  language: Language

  hydrate: () => Promise<void>
  markVisited: (code: string) => Promise<void>
  unmarkVisited: (code: string) => Promise<void>
  toggleVisited: (code: string) => Promise<void>
  forgetCountry: (code: string) => Promise<void>
  /** Le `photos` vengono salvate come Blob e collegate via `photoIds`. */
  addVisit: (input: NewVisit, photos?: readonly Blob[]) => Promise<Visit | null>
  /**
   * Modifica un viaggio. Le foto nuove si salvano prima, quelle tolte si
   * eliminano dopo: a meta strada il viaggio referenzia solo foto esistenti.
   */
  updateVisit: (id: string, changes: VisitChanges, photos?: readonly Blob[]) => Promise<Visit | null>
  removeVisit: (id: string) => Promise<void>
  /** `photos` arriva dallo ZIP di backup: id -> Blob. */
  importData: (raw: unknown, photos?: ReadonlyMap<string, Blob>) => Promise<ImportOutcome>
  exportData: () => TravelDataExport
  /** Export completo, foto comprese. Asincrono perché le legge da IndexedDB. */
  exportBackup: () => Promise<BackupBundle>
  resetData: () => Promise<void>
  setLanguage: (language: Language) => Promise<void>
  clearLastError: () => void
}

const STORAGE_UNAVAILABLE_MESSAGE: StoreMessage = { key: 'storage.unavailable' }

const GENERIC_WRITE_ERROR: StoreMessage = { key: 'storage.writeFailed' }

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
    // Prima di leggere le preferenze si parte dalla lingua del sistema: senza,
    // un utente italiano vedrebbe un lampo di inglese a ogni avvio.
    language: detectLanguage(),

    hydrate: async () => {
      if (get().status !== 'idle') return
      set({ status: 'hydrating' })

      try {
        const [manuallyMarked, visits, storedLanguage] = await Promise.all([
          loadManuallyMarked(),
          loadVisits(),
          readStoredLanguage(),
        ])
        set({
          manuallyMarked,
          visits,
          status: 'ready',
          storage: 'available',
          storageMessage: null,
          ...(isLanguage(storedLanguage) ? { language: storedLanguage } : {}),
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
          storageMessage: unavailable ? STORAGE_UNAVAILABLE_MESSAGE : { key: 'storage.readFailed' },
        })
      }
    },

    markVisited: async (code) => {
      const normalized = normalizeCode(code)
      if (!isKnownCountryCode(normalized)) {
        set({ lastError: { key: 'storage.unknownCountry', vars: { code: normalized } } })
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

    addVisit: async (input, photos) => {
      const countryCode = normalizeCode(input.countryCode)
      if (!isKnownCountryCode(countryCode)) {
        set({ lastError: { key: 'storage.unknownCountry', vars: { code: countryCode } } })
        return null
      }
      if (!isValidVisitDate(input.date)) {
        set({ lastError: { key: 'storage.invalidDate' } })
        return null
      }

      // Le foto vanno salvate PRIMA del viaggio: servono i loro id per
      // collegarle. Se l'archiviazione non c'è, il viaggio si aggiunge lo
      // stesso senza foto e l'avviso spiega perché.
      let photoIds = input.photoIds ?? []
      const incoming = photos ?? []
      if (incoming.length > 0) {
        try {
          const saved = await Promise.all(incoming.map((photo) => savePhoto(photo)))
          photoIds = [...photoIds, ...saved]
        } catch (error) {
          if (error instanceof StorageUnavailableError) {
            set({ storage: 'unavailable', storageMessage: STORAGE_UNAVAILABLE_MESSAGE })
            photoIds = []
          } else {
            set({ lastError: { key: 'storage.photoFailed' } })
            return null
          }
        }
      }

      const visit: Visit = { ...input, id: input.id ?? newId(), countryCode }
      if (photoIds.length === 0) delete visit.photoIds
      else visit.photoIds = photoIds

      const previous = get().visits
      set({ visits: [visit, ...previous], lastError: null })

      if ((await persist(() => saveVisit(visit))) === 'failed') {
        set({ visits: previous })
        return null
      }
      return visit
    },

    updateVisit: async (id, changes, photos) => {
      const previous = get().visits
      const existing = previous.find((item) => item.id === id)
      if (!existing) return null

      const countryCode = normalizeCode(changes.countryCode)
      if (!isKnownCountryCode(countryCode)) {
        set({ lastError: { key: 'storage.unknownCountry', vars: { code: countryCode } } })
        return null
      }
      if (!isValidVisitDate(changes.date)) {
        set({ lastError: { key: 'storage.invalidDate' } })
        return null
      }

      // Si tengono solo foto che il viaggio aveva davvero: un id inventato
      // dall'esterno non puo entrare da qui.
      const before = existing.photoIds ?? []
      let photoIds = (changes.photoIds ?? []).filter((photoId) => before.includes(photoId))

      const incoming = photos ?? []
      if (incoming.length > 0) {
        try {
          const saved = await Promise.all(incoming.map((photo) => savePhoto(photo)))
          photoIds = [...photoIds, ...saved]
        } catch (error) {
          if (error instanceof StorageUnavailableError) {
            set({ storage: 'unavailable', storageMessage: STORAGE_UNAVAILABLE_MESSAGE })
          } else {
            set({ lastError: { key: 'storage.photoFailed' } })
            return null
          }
        }
      }

      const visit: Visit = { ...changes, id, countryCode }
      if (photoIds.length === 0) delete visit.photoIds
      else visit.photoIds = photoIds

      set({ visits: previous.map((item) => (item.id === id ? visit : item)), lastError: null })

      const dropped = before.some((photoId) => !photoIds.includes(photoId))
      const outcome = await persist(async () => {
        await saveVisit(visit)
        // Le foto tolte non devono restare a occupare quota.
        if (dropped) await removeOrphanPhotos()
      })
      if (outcome === 'failed') {
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
        // Le foto collegate non devono restare a occupare quota.
        if (visit.photoIds?.length) await removeOrphanPhotos()
      })
      if (outcome === 'failed') {
        set({ visits: previous })
      }
    },

    importData: async (raw, photos) => {
      const parsed = parseTravelData(raw)
      if (!parsed.ok) {
        set({ lastError: parsed.errors[0] ?? { key: 'storage.invalidFile' } })
        return { ok: false, errors: parsed.errors, warnings: [] }
      }

      const previous = snapshot(get())
      set({
        manuallyMarked: parsed.data.manuallyMarked,
        visits: parsed.data.visits,
        lastError: null,
      })

      const outcome = await persist(async () => {
        // Le foto vanno rimesse PRIMA di ripulire gli orfani, altrimenti la
        // pulizia cancellerebbe proprio quelle appena ripristinate.
        if (photos) {
          for (const [id, blob] of photos) {
            await restorePhoto(id, blob)
          }
        }
        await replaceManuallyMarked(parsed.data.manuallyMarked)
        await replaceVisits(parsed.data.visits)
        await removeOrphanPhotos()
      })

      if (outcome === 'failed') {
        set({ manuallyMarked: previous.manuallyMarked, visits: previous.visits })
        return {
          ok: false,
          errors: [{ key: 'storage.importFailed' }],
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

    /**
     * Stato e foto insieme, pronti per essere impacchettati.
     * Si esportano TUTTE le foto presenti, non solo quelle referenziate: se
     * per un errore un riferimento si fosse perso, il backup e comunque il
     * posto sbagliato dove buttare via l'immagine di qualcuno.
     */
    exportBackup: async () => {
      const data = get().exportData()
      try {
        return { data, photos: await loadAllPhotos() }
      } catch {
        // Senza archiviazione si esporta comunque quello che c'e in memoria.
        return { data, photos: [] }
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

    /**
     * Cambia lingua e la ricorda. Non e un dato di viaggio: sta in una
     * tabella a parte, non entra nel backup e `resetData` non la tocca.
     */
    setLanguage: async (language) => {
      if (get().language === language) return
      set({ language })
      await writeStoredLanguage(language)
    },

    clearLastError: () => set({ lastError: null }),
  }
})

/** Stato iniziale, per i test e per `resetData` in memoria. */
export const initialTravelState: TravelData = { manuallyMarked: [], visits: [] }
