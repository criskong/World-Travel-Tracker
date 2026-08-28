import { Suspense, lazy } from 'react'

// Il bundle three.js è pesante: fuori dal chunk iniziale.
const GlobeView = lazy(() => import('./components/Globe/GlobeView'))

export default function App() {
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
