/**
 * Bandiera come emoji, derivata dal codice ISO alpha-2 convertendo le due
 * lettere in Regional Indicator Symbols. Nessuna immagine, nessuna rete.
 *
 * Non tutte le piattaforme disegnano tutte le bandiere (Windows, per dire,
 * mostra le due lettere): è accettabile, il codice ISO resta comunque
 * visibile accanto al nome.
 */
const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0)

export function flagEmoji(code: string): string {
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️'
  return String.fromCodePoint(
    normalized.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
    normalized.charCodeAt(1) + REGIONAL_INDICATOR_OFFSET,
  )
}
