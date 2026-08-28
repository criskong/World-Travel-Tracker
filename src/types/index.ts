export const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
] as const

export type Continent = (typeof CONTINENTS)[number]

export interface Country {
  /** ISO-3166-1 alpha-2 */
  code: string
  name: string
  continent: Continent
}

export interface Visit {
  id: string
  /** ISO-3166-1 alpha-2, deve esistere in `countries.ts`. */
  countryCode: string
  /** Data in formato ISO `YYYY-MM-DD`. */
  date: string
  city?: string
  note?: string
  /** Riferimento a un Blob nella tabella `photos`. Mai la foto stessa. */
  photoId?: string
}

/**
 * Tutto ciò che viene persistito. `isVisited` NON compare qui: è derivato
 * da questi due campi e non va mai salvato.
 */
export interface TravelData {
  manuallyMarked: string[]
  visits: Visit[]
}

/** Versione corrente del formato di import/export. */
export const TRAVEL_DATA_FORMAT_VERSION = 1

/** Payload del file JSON di backup: `TravelData` più i metadati di formato. */
export interface TravelDataExport extends TravelData {
  formatVersion: number
  exportedAt: string
}
