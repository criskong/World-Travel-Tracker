import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

/**
 * Navigazione desktop. Nascosta sotto lg, dove subentra la bottom navigation.
 * Non è sopra il canvas WebGL, quindi può permettersi uno sfondo pieno.
 */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-edge bg-base-800/60 pl-safe-l pt-safe-t lg:flex">
      <div className="px-5 py-6">
        <p className="text-sm font-semibold tracking-tight text-slate-100">World Travel Tracker</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          See where you’ve been.
          <br />
          Discover where you’ll go next.
        </p>
      </div>

      <nav aria-label="Navigazione principale" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                title={item.description}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-accent-dim text-accent'
                      : 'text-slate-400 hover:bg-surface-raised hover:text-slate-200',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      aria-hidden
                      className="shrink-0"
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <p className="px-5 py-4 text-[11px] text-slate-600">Tutti i dati restano su questo device.</p>
    </aside>
  )
}
