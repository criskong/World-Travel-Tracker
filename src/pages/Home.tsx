import { Suspense, lazy, useCallback, useState } from 'react'
import { CountryDetailsPanel } from '../components/CountryDetails/CountryDetailsPanel'
import { StatsSection } from '../components/Stats/StatsSection'
import { RecentTrips } from '../components/Timeline/RecentTrips'

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
          World Travel Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          See where you’ve been. Discover where you’ll go next.
        </p>
      </header>

      <section
        aria-label="Globo interattivo"
        className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-2xl border border-edge bg-base-900 shadow-card sm:h-[58vh]"
      >
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">
              Caricamento del globo…
            </div>
          }
        >
          <GlobeView onSelectCountry={handleSelectCountry} selectedIso={selectedIso} />
        </Suspense>

        {selectedIso !== null && (
          <CountryDetailsPanel code={selectedIso} onClose={handleClose} />
        )}
      </section>

      <StatsSection />
      <RecentTrips />
    </div>
  )
}
