/**
 * Facciata pubblica del layer di storage.
 * I componenti e lo store importano da qui (o dai singoli servizi),
 * mai da `db.ts`.
 */
export { StorageUnavailableError } from './db'
export type { StorageUnavailableReason } from './db'

export {
  loadManuallyMarked,
  addManuallyMarked,
  removeManuallyMarked,
  replaceManuallyMarked,
  clearManuallyMarked,
} from './countries'

export {
  loadVisits,
  saveVisit,
  updateVisit,
  removeVisit,
  removeVisitsForCountry,
  replaceVisits,
  clearVisits,
} from './trips'

export { savePhoto, loadPhoto, removePhoto, removeOrphanPhotos, clearPhotos } from './photos'

export { requestPersistentStorage } from './persistence'
export type { PersistenceResult } from './persistence'

export {
  readCachedDataset,
  writeCachedDataset,
  pruneCachedDatasets,
  cachedDatasetSize,
  clearCachedDatasets,
} from './geoDataset'
