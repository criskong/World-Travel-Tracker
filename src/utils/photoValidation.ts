/**
 * Validazione delle foto prima di scriverle su IndexedDB.
 *
 * Senza un limite esplicito una foto da 40 MB entrerebbe in silenzio e
 * mangerebbe la quota del browser: quando la quota finisce, IndexedDB inizia
 * a rifiutare le scritture e l'utente non capisce perché.
 */

/** Limite per singola foto. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

export type PhotoValidation = { ok: true } | { ok: false; error: string }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validatePhoto(file: { type: string; size: number }): PhotoValidation {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'That file is not an image. Pick a JPEG, PNG, WebP or GIF.' }
  }
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return { ok: false, error: `${file.type} is not supported. Use JPEG, PNG, WebP or GIF.` }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `This photo is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_PHOTO_BYTES)} — pick a smaller one.`,
    }
  }
  if (file.size === 0) {
    return { ok: false, error: 'That file is empty.' }
  }
  return { ok: true }
}
