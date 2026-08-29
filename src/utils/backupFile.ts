import type { TravelDataExport } from '../types'

/** Nome del file di backup. Un nome solo, in un posto solo. */
export const BACKUP_FILENAME = 'world-travel-tracker-backup.json'

/**
 * Salva il backup sul disco dell'utente.
 *
 * Niente rete: si costruisce un Blob in memoria, si crea un object URL e lo
 * si dà a un `<a download>`. È l'unico modo di "scaricare" un file in un'app
 * che non ha un server (CLAUDE.md, Vincoli non negoziabili).
 */
export function downloadBackup(payload: TravelDataExport, filename = BACKUP_FILENAME): void {
  // Indentato: un backup è un file che l'utente può aprire e leggere.
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoca differita: alcuni browser leggono l'URL dopo che il click è
  // tornato, e revocarlo subito produrrebbe un file vuoto.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
