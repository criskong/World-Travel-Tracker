import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/Navigation/AppLayout'
import { useTravelStore } from './store/travelStore'
import Home from './pages/Home'

// Code splitting per route: solo la Home entra nel chunk iniziale, perché è
// quella che l'utente vede sempre per prima.
const Countries = lazy(() => import('./pages/Countries'))
const Trips = lazy(() => import('./pages/Trips'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="flex min-h-full items-center justify-center py-16 text-sm text-slate-600">
      Loading…
    </div>
  )
}

export default function App() {
  const hydrate = useTravelStore((state) => state.hydrate)

  // L'idratazione parte subito, senza aspettare il chunk del globo.
  // `hydrate` è idempotente: StrictMode la invoca due volte in sviluppo.
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route
          path="countries"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Countries />
            </Suspense>
          }
        />
        <Route
          path="trips"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Trips />
            </Suspense>
          }
        />
        <Route
          path="statistics"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Statistics />
            </Suspense>
          }
        />
        <Route
          path="achievements"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Achievements />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
