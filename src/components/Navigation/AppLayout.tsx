import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { StorageBanner } from '../UI/StorageBanner'
import { ServiceWorkerUpdate } from '../UI/ServiceWorkerUpdate'
import Home from '../../pages/Home'

/**
 * Scheletro dell'app: sidebar su desktop, bottom navigation su mobile.
 * Lo scroll vive nel `<main>`, non nel body: cosi la bottom nav resta
 * ancorata e le safe-area insets non vengono attraversate dal contenuto.
 *
 * Home NON passa dall'`<Outlet>`: e montata qui stabilmente e viene solo
 * nascosta quando si va altrove. Il motivo e il globo. Smontarlo a ogni
 * navigazione significa ricostruire 610 mesh e un contesto WebGL da capo:
 * ~300 ms su desktop, molti di piu su telefono, ogni volta che si torna
 * sulla home. Con questa disposizione il globo si costruisce una volta per
 * sessione e resta esattamente dov'era, orientamento compreso.
 *
 * Il prezzo e che la Home resta in memoria mentre si guardano le altre
 * pagine. GlobeView se ne accorge da se (il contenitore misura 0x0) e mette
 * in pausa il ciclo di rendering, quindi non consuma GPU a vuoto.
 */
export function AppLayout() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-base-900 text-slate-200">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <StorageBanner />
        <main className="scroll-area flex-1 overflow-y-auto pl-safe-l pr-safe-r">
          <div hidden={!onHome}>
            <Home />
          </div>
          {!onHome && <Outlet />}
        </main>
        <BottomNav />
      </div>

      <ServiceWorkerUpdate />
    </div>
  )
}
