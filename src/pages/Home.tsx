import { Suspense, lazy, useCallback, useState } from 'react'
import { Globe2, RefreshCw } from 'lucide-react'
import { ErrorBoundary } from '../components/UI/ErrorBoundary'
import { CountryDetails } from '../components/CountryDetails/CountryDetails'
import { StatsSection } from '../components/Stats/StatsSection'
import { RecentTrips } from '../components/Timeline/RecentTrips'
import { useTranslation } from '../i18n/useTranslation'

// Il bundle three.js è pesante: fuori dal chunk iniziale.
// `lazy` sta a livello di modulo: se stesse dentro il componente, ogni render
// creerebbe un tipo nuovo e il globo si rimonterebbe da capo.
const GlobeView = lazy(() => import('../components/Globe/GlobeView'))

/**
 * Home: header, globo dominante, statistiche e viaggi recenti sotto.
 *
 * Questo componente NON legge le statistiche dallo store. Si sottoscrivono
 * `StatsSection` e `RecentTrips`, che sono fratelli del globo nel DOM: quando
 * i numeri cambiano, Home non ri-renderizza e il globo non viene toccato.
 * L'unico stato locale è il Paese selezionato, che apre CountryDetails.
 */
export default function Home() {
  const { t } = useTranslation()
  const [selectedIso, setSelectedIso] = useState<string | null>(null)

  const handleSelectCountry = useCallback((iso: string) => {
    setSelectedIso(iso)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedIso(null)
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('home.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('home.tagline')}</p>
      </header>

      <section
        aria-label={t('home.globe')}
        className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-2xl border border-edge bg-base-900 shadow-card sm:h-[58vh]"
      >
        {/*
          Il globo dipende da WebGL, che puo mancare: driver vecchi,
          accelerazione disattivata, troppi contesti aperti. Se salta, il
          confine tiene in piedi tutto il resto della pagina.
        */}
        <ErrorBoundary label="globe" fallback={(retry) => <GlobeUnavailable onRetry={retry} />}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-sm text-subtle">
                {t('home.globe.loading')}
              </div>
            }
          >
            <GlobeView onSelectCountry={handleSelectCountry} selectedIso={selectedIso} />
          </Suspense>
        </ErrorBoundary>

        {selectedIso !== null && (
          /*
           * Pannello piccolo sopra il canvas: qui il blur è ammesso
           * (CLAUDE.md, sezione Design). Mai un overlay a schermo intero.
           */
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 top-3 z-10 flex animate-slide-in flex-col overflow-hidden rounded-2xl border border-edge-strong bg-surface-strong shadow-card backdrop-blur-md sm:inset-y-3 sm:left-auto sm:right-3 sm:w-80">
            <CountryDetails code={selectedIso} onClose={handleClose} />
          </div>
        )}
      </section>

      <StatsSection />
      <RecentTrips />
    </div>
  )
}

/**
 * Il globo non si e potuto disegnare. Nessuno stack trace: si dice cosa e
 * successo, che il resto funziona lo stesso, e si offre un tentativo.
 */
function GlobeUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-edge bg-surface">
        <Globe2 size={22} strokeWidth={1.6} className="text-muted" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-200">{t('home.globe.failed')}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
          {t('home.globe.failedHint')}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-edge-strong bg-surface-raised px-3.5 py-1.5 text-sm text-slate-200 transition-colors hover:border-accent/40 hover:text-accent"
      >
        <RefreshCw size={14} aria-hidden />
        {t('common.tryAgain')}
      </button>
    </div>
  )
}
