import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { StorageBanner } from '../UI/StorageBanner'

/**
 * Scheletro dell'app: sidebar su desktop, bottom navigation su mobile.
 * Lo scroll vive nel `<main>`, non nel body: così la bottom nav resta
 * ancorata e le safe-area insets non vengono attraversate dal contenuto.
 */
export function AppLayout() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-base-900 text-slate-200">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <StorageBanner />
        <main className="scroll-area flex-1 overflow-y-auto pl-safe-l pr-safe-r">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
