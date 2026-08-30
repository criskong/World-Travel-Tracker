import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

/**
 * Navigazione mobile. `pb-safe-b` tiene le voci sopra la home indicator di iOS:
 * senza, l'ultima riga finisce sotto il bordo dello schermo.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="shrink-0 border-t border-edge bg-base-800/95 pb-safe-b lg:hidden"
    >
      <ul className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex h-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] transition-colors duration-150',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                  <span className="truncate leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
