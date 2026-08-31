import { CountryDetails } from './CountryDetails'
import { useTranslation } from '../../i18n/useTranslation'

interface CountryDetailsDrawerProps {
  code: string | null
  onClose: () => void
}

/**
 * Ospita CountryDetails come drawer: pannello a destra su desktop, foglio dal
 * basso su mobile. Usato dalle pagine con lista (Countries, Trips).
 *
 * Il velo è tinto e non sfocato: coerente con il resto e senza costi di
 * compositing su mobile.
 */
export function CountryDetailsDrawer({ code, onClose }: CountryDetailsDrawerProps) {
  const { t } = useTranslation()
  if (code === null) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-end sm:items-stretch">
      <button
        type="button"
        aria-label={t('details.close')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 animate-fade-in"
      />
      <div className="relative flex max-h-[85dvh] w-full animate-slide-in flex-col overflow-hidden rounded-t-2xl border border-edge-strong bg-base-800 pb-safe-b shadow-card sm:h-full sm:max-h-none sm:w-96 sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0">
        <CountryDetails code={code} onClose={onClose} />
      </div>
    </div>
  )
}
