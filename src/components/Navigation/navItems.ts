import { ChartColumn, Compass, MapPinned, Plane, Settings, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** Etichetta più lunga per lo screen reader e per il tooltip della sidebar. */
  description: string
  icon: LucideIcon
}

/** Ordine unico di navigazione: sidebar desktop e bottom nav mobile lo condividono. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Home', description: 'Globe and summary', icon: Compass },
  { to: '/countries', label: 'Countries', description: 'Every country', icon: MapPinned },
  { to: '/trips', label: 'Trips', description: 'Your trips', icon: Plane },
  { to: '/statistics', label: 'Statistics', description: 'Numbers and charts', icon: ChartColumn },
  { to: '/achievements', label: 'Achievements', description: 'Milestones unlocked', icon: Trophy },
  { to: '/settings', label: 'Settings', description: 'Data and preferences', icon: Settings },
]
