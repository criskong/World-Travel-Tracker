/**
 * Identificatori locali. `crypto.randomUUID` esiste solo in secure context:
 * il fallback evita che l'app si rompa su http:// in rete locale.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
