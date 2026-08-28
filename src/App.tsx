import { Suspense, lazy, useEffect } from 'react'
import { useTravelStore } from './store/travelStore'

// Il bundle three.js è pesante: fuori dal chunk iniziale.
const GlobeView = lazy(() => import('./components/Globe/GlobeView'))

export default function App() {
  const hydrate = useTravelStore((state) => state.hydrate)

  // L'idratazione parte subito, senza aspettare il chunk del globo.
  // `hydrate` è idempotente: StrictMode la invoca due volte in sviluppo.
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <main className="h-dvh w-screen bg-base-900 text-slate-200">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            Caricamento del globo…
          </div>
        }
      >
        <GlobeView />
      </Suspense>
    </main>
  )
}
