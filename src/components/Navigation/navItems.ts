import { ChartColumn, Compass, MapPinned, Plane, Settings, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from '../../i18n/translate'

export interface NavItem {
  to: string
  /** Chiave di traduzione dell'etichetta. Il testo lo risolve chi disegna. */
  label: TranslationKey
  /** Etichetta più lunga per lo screen reader e per il tooltip della sidebar. */
  description: TranslationKey
  icon: LucideIcon
}

/** Ordine unico di navigazione: sidebar desktop e bottom nav mobile lo condividono. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'nav.home', description: 'nav.home.description', icon: Compass },
  { to: '/countries', label: 'nav.countries', description: 'nav.countries.description', icon: MapPinned },
  { to: '/trips', label: 'nav.trips', description: 'nav.trips.description', icon: Plane },
  { to: '/statistics', label: 'nav.statistics', description: 'nav.statistics.description', icon: ChartColumn },
  { to: '/achievements', label: 'nav.achievements', description: 'nav.achievements.description', icon: Trophy },
  { to: '/settings', label: 'nav.settings', description: 'nav.settings.description', icon: Settings },
]
