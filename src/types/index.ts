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
