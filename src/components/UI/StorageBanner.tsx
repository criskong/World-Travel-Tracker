import { TriangleAlert } from 'lucide-react'
import { useTravelStore } from '../../store/travelStore'
import { useTranslation } from '../../i18n/useTranslation'

/**
 * Avviso di archiviazione non disponibile (vedi CLAUDE.md, "Decisioni prese").
 * Sta nel flusso del layout, non sopra il canvas: niente blur, nessun costo
 * di compositing sul globo.
 */
export function StorageBanner() {
  const { t } = useTranslation()
  const storageMessage = useTravelStore((state) => state.storageMessage)
  if (storageMessage === null) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100 sm:px-6"
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
      <p className="leading-snug">{t(storageMessage.key, storageMessage.vars)}</p>
    </div>
  )
}
