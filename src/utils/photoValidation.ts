import type { LocalizedMessage } from '../i18n/message'

/**
 * Validazione delle foto prima di decodificarle (`photoProcessing.ts`).
 *
 * Il limite qui e sul file di PARTENZA, non su quello salvato: dopo il
 * ridimensionamento una foto pesa poche centinaia di KB. Serve comunque un
 * tetto, perche decodificare un TIFF da 200 MB su un telefono lo blocca.
 */

/** Limite sul file scelto. Ci sta qualunque cosa esca da un telefono. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024

/**
 * Quante foto puo avere un viaggio.
 * Un tetto serve: senza, un viaggio con trecento foto riempirebbe la quota
 * del browser e le scritture inizierebbero a fallire senza spiegazione. Dieci
 * e abbastanza per ricordarsi un viaggio e poco abbastanza da non far male.
 */
export const MAX_PHOTOS_PER_VISIT = 10

/**
 * Formati che si sa che il browser legge ovunque. Gli altri `image/*` — HEIC
 * su iPhone, per dirne uno — non si rifiutano a priori: si prova a
 * decodificarli, e a rifiutare ci pensa il browser se non li conosce.
 */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

export type PhotoValidation = { ok: true } | { ok: false; error: LocalizedMessage }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validatePhoto(file: { type: string; size: number }): PhotoValidation {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: { key: 'photo.notImage' } }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: {
        key: 'photo.tooLarge',
        vars: { size: formatBytes(file.size), limit: formatBytes(MAX_PHOTO_BYTES) },
      },
    }
  }
  if (file.size === 0) {
    return { ok: false, error: { key: 'photo.empty' } }
  }
  return { ok: true }
}
