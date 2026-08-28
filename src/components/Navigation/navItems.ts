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
  { to: '/', label: 'Home', description: 'Globo e riepilogo', icon: Compass },
  { to: '/countries', label: 'Paesi', description: 'Elenco dei Paesi', icon: MapPinned },
  { to: '/trips', label: 'Viaggi', description: 'I tuoi viaggi', icon: Plane },
  { to: '/statistics', label: 'Statistiche', description: 'Numeri e grafici', icon: ChartColumn },
  { to: '/achievements', label: 'Achievement', description: 'Obiettivi sbloccati', icon: Trophy },
  { to: '/settings', label: 'Impostazioni', description: 'Dati e preferenze', icon: Settings },
]
