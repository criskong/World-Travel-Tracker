import type { Continent, Country } from '../../types'

/**
 * FONTE DI VERITÀ dell'applicazione per l'elenco dei Paesi.
 *
 * Contiene tutti i 249 codici ISO-3166-1 alpha-2 "officially assigned",
 * più `XK` (Kosovo), che è formalmente "user-assigned exceptionally reserved"
 * ma è lo standard de facto ed è presente nel dataset Natural Earth.
 *
 * Ogni statistica, totale e percentuale dell'app si calcola da QUESTA lista.
 * Non contare mai le feature del GeoJSON: quel dataset serve solo per la
 * geometria e la sua granularità non coincide con ISO-3166-1.
 *
 * L'assegnazione al continente segue la convenzione di Natural Earth
 * (Russia -> Europe; Turchia, Cipro e Caucaso -> Asia), così che le
 * aggregazioni per continente restino coerenti con ciò che si vede sul globo.
 */
export const COUNTRIES: readonly Country[] = [
  { code: 'AD', name: 'Andorra', continent: 'Europe' },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Asia' },
  { code: 'AF', name: 'Afghanistan', continent: 'Asia' },
  { code: 'AG', name: 'Antigua and Barbuda', continent: 'North America' },
  { code: 'AI', name: 'Anguilla', continent: 'North America' },
  { code: 'AL', name: 'Albania', continent: 'Europe' },
  { code: 'AM', name: 'Armenia', continent: 'Asia' },
  { code: 'AO', name: 'Angola', continent: 'Africa' },
  { code: 'AQ', name: 'Antarctica', continent: 'Antarctica' },
  { code: 'AR', name: 'Argentina', continent: 'South America' },
  { code: 'AS', name: 'American Samoa', continent: 'Oceania' },
  { code: 'AT', name: 'Austria', continent: 'Europe' },
  { code: 'AU', name: 'Australia', continent: 'Oceania' },
  { code: 'AW', name: 'Aruba', continent: 'North America' },
  { code: 'AX', name: 'Åland Islands', continent: 'Europe' },
  { code: 'AZ', name: 'Azerbaijan', continent: 'Asia' },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'Europe' },
  { code: 'BB', name: 'Barbados', continent: 'North America' },
  { code: 'BD', name: 'Bangladesh', continent: 'Asia' },
  { code: 'BE', name: 'Belgium', continent: 'Europe' },
  { code: 'BF', name: 'Burkina Faso', continent: 'Africa' },
  { code: 'BG', name: 'Bulgaria', continent: 'Europe' },
  { code: 'BH', name: 'Bahrain', continent: 'Asia' },
  { code: 'BI', name: 'Burundi', continent: 'Africa' },
  { code: 'BJ', name: 'Benin', continent: 'Africa' },
  { code: 'BL', name: 'Saint Barthélemy', continent: 'North America' },
  { code: 'BM', name: 'Bermuda', continent: 'North America' },
  { code: 'BN', name: 'Brunei Darussalam', continent: 'Asia' },
  { code: 'BO', name: 'Bolivia', continent: 'South America' },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba', continent: 'North America' },
  { code: 'BR', name: 'Brazil', continent: 'South America' },
  { code: 'BS', name: 'Bahamas', continent: 'North America' },
  { code: 'BT', name: 'Bhutan', continent: 'Asia' },
  { code: 'BV', name: 'Bouvet Island', continent: 'Antarctica' },
  { code: 'BW', name: 'Botswana', continent: 'Africa' },
  { code: 'BY', name: 'Belarus', continent: 'Europe' },
  { code: 'BZ', name: 'Belize', continent: 'North America' },
  { code: 'CA', name: 'Canada', continent: 'North America' },
  { code: 'CC', name: 'Cocos (Keeling) Islands', continent: 'Oceania' },
  { code: 'CD', name: 'Democratic Republic of the Congo', continent: 'Africa' },
  { code: 'CF', name: 'Central African Republic', continent: 'Africa' },
  { code: 'CG', name: 'Republic of the Congo', continent: 'Africa' },
  { code: 'CH', name: 'Switzerland', continent: 'Europe' },
  { code: 'CI', name: "Côte d'Ivoire", continent: 'Africa' },
  { code: 'CK', name: 'Cook Islands', continent: 'Oceania' },
  { code: 'CL', name: 'Chile', continent: 'South America' },
  { code: 'CM', name: 'Cameroon', continent: 'Africa' },
  { code: 'CN', name: 'China', continent: 'Asia' },
  { code: 'CO', name: 'Colombia', continent: 'South America' },
  { code: 'CR', name: 'Costa Rica', continent: 'North America' },
  { code: 'CU', name: 'Cuba', continent: 'North America' },
  { code: 'CV', name: 'Cabo Verde', continent: 'Africa' },
  { code: 'CW', name: 'Curaçao', continent: 'North America' },
  { code: 'CX', name: 'Christmas Island', continent: 'Oceania' },
  { code: 'CY', name: 'Cyprus', continent: 'Asia' },
  { code: 'CZ', name: 'Czechia', continent: 'Europe' },
  { code: 'DE', name: 'Germany', continent: 'Europe' },
  { code: 'DJ', name: 'Djibouti', continent: 'Africa' },
  { code: 'DK', name: 'Denmark', continent: 'Europe' },
  { code: 'DM', name: 'Dominica', continent: 'North America' },
  { code: 'DO', name: 'Dominican Republic', continent: 'North America' },
  { code: 'DZ', name: 'Algeria', continent: 'Africa' },
  { code: 'EC', name: 'Ecuador', continent: 'South America' },
  { code: 'EE', name: 'Estonia', continent: 'Europe' },
  { code: 'EG', name: 'Egypt', continent: 'Africa' },
  { code: 'EH', name: 'Western Sahara', continent: 'Africa' },
  { code: 'ER', name: 'Eritrea', continent: 'Africa' },
  { code: 'ES', name: 'Spain', continent: 'Europe' },
  { code: 'ET', name: 'Ethiopia', continent: 'Africa' },
  { code: 'FI', name: 'Finland', continent: 'Europe' },
  { code: 'FJ', name: 'Fiji', continent: 'Oceania' },
  { code: 'FK', name: 'Falkland Islands', continent: 'South America' },
  { code: 'FM', name: 'Micronesia', continent: 'Oceania' },
  { code: 'FO', name: 'Faroe Islands', continent: 'Europe' },
  { code: 'FR', name: 'France', continent: 'Europe' },
  { code: 'GA', name: 'Gabon', continent: 'Africa' },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe' },
  { code: 'GD', name: 'Grenada', continent: 'North America' },
  { code: 'GE', name: 'Georgia', continent: 'Asia' },
  { code: 'GF', name: 'French Guiana', continent: 'South America' },
  { code: 'GG', name: 'Guernsey', continent: 'Europe' },
  { code: 'GH', name: 'Ghana', continent: 'Africa' },
  { code: 'GI', name: 'Gibraltar', continent: 'Europe' },
  { code: 'GL', name: 'Greenland', continent: 'North America' },
  { code: 'GM', name: 'Gambia', continent: 'Africa' },
  { code: 'GN', name: 'Guinea', continent: 'Africa' },
  { code: 'GP', name: 'Guadeloupe', continent: 'North America' },
  { code: 'GQ', name: 'Equatorial Guinea', continent: 'Africa' },
  { code: 'GR', name: 'Greece', continent: 'Europe' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', continent: 'Antarctica' },
  { code: 'GT', name: 'Guatemala', continent: 'North America' },
  { code: 'GU', name: 'Guam', continent: 'Oceania' },
  { code: 'GW', name: 'Guinea-Bissau', continent: 'Africa' },
  { code: 'GY', name: 'Guyana', continent: 'South America' },
  { code: 'HK', name: 'Hong Kong', continent: 'Asia' },
  { code: 'HM', name: 'Heard Island and McDonald Islands', continent: 'Antarctica' },
  { code: 'HN', name: 'Honduras', continent: 'North America' },
  { code: 'HR', name: 'Croatia', continent: 'Europe' },
  { code: 'HT', name: 'Haiti', continent: 'North America' },
  { code: 'HU', name: 'Hungary', continent: 'Europe' },
  { code: 'ID', name: 'Indonesia', continent: 'Asia' },
  { code: 'IE', name: 'Ireland', continent: 'Europe' },
  { code: 'IL', name: 'Israel', continent: 'Asia' },
  { code: 'IM', name: 'Isle of Man', continent: 'Europe' },
  { code: 'IN', name: 'India', continent: 'Asia' },
  { code: 'IO', name: 'British Indian Ocean Territory', continent: 'Africa' },
  { code: 'IQ', name: 'Iraq', continent: 'Asia' },
  { code: 'IR', name: 'Iran', continent: 'Asia' },
  { code: 'IS', name: 'Iceland', continent: 'Europe' },
  { code: 'IT', name: 'Italy', continent: 'Europe' },
  { code: 'JE', name: 'Jersey', continent: 'Europe' },
  { code: 'JM', name: 'Jamaica', continent: 'North America' },
  { code: 'JO', name: 'Jordan', continent: 'Asia' },
  { code: 'JP', name: 'Japan', continent: 'Asia' },
  { code: 'KE', name: 'Kenya', continent: 'Africa' },
  { code: 'KG', name: 'Kyrgyzstan', continent: 'Asia' },
  { code: 'KH', name: 'Cambodia', continent: 'Asia' },
  { code: 'KI', name: 'Kiribati', continent: 'Oceania' },
  { code: 'KM', name: 'Comoros', continent: 'Africa' },
  { code: 'KN', name: 'Saint Kitts and Nevis', continent: 'North America' },
  { code: 'KP', name: 'North Korea', continent: 'Asia' },
  { code: 'KR', name: 'South Korea', continent: 'Asia' },
  { code: 'KW', name: 'Kuwait', continent: 'Asia' },
  { code: 'KY', name: 'Cayman Islands', continent: 'North America' },
  { code: 'KZ', name: 'Kazakhstan', continent: 'Asia' },
  { code: 'LA', name: 'Laos', continent: 'Asia' },
  { code: 'LB', name: 'Lebanon', continent: 'Asia' },
  { code: 'LC', name: 'Saint Lucia', continent: 'North America' },
  { code: 'LI', name: 'Liechtenstein', continent: 'Europe' },
  { code: 'LK', name: 'Sri Lanka', continent: 'Asia' },
  { code: 'LR', name: 'Liberia', continent: 'Africa' },
  { code: 'LS', name: 'Lesotho', continent: 'Africa' },
  { code: 'LT', name: 'Lithuania', continent: 'Europe' },
  { code: 'LU', name: 'Luxembourg', continent: 'Europe' },
  { code: 'LV', name: 'Latvia', continent: 'Europe' },
  { code: 'LY', name: 'Libya', continent: 'Africa' },
  { code: 'MA', name: 'Morocco', continent: 'Africa' },
  { code: 'MC', name: 'Monaco', continent: 'Europe' },
  { code: 'MD', name: 'Moldova', continent: 'Europe' },
  { code: 'ME', name: 'Montenegro', continent: 'Europe' },
  { code: 'MF', name: 'Saint Martin', continent: 'North America' },
  { code: 'MG', name: 'Madagascar', continent: 'Africa' },
  { code: 'MH', name: 'Marshall Islands', continent: 'Oceania' },
  { code: 'MK', name: 'North Macedonia', continent: 'Europe' },
  { code: 'ML', name: 'Mali', continent: 'Africa' },
  { code: 'MM', name: 'Myanmar', continent: 'Asia' },
  { code: 'MN', name: 'Mongolia', continent: 'Asia' },
  { code: 'MO', name: 'Macao', continent: 'Asia' },
  { code: 'MP', name: 'Northern Mariana Islands', continent: 'Oceania' },
  { code: 'MQ', name: 'Martinique', continent: 'North America' },
  { code: 'MR', name: 'Mauritania', continent: 'Africa' },
  { code: 'MS', name: 'Montserrat', continent: 'North America' },
  { code: 'MT', name: 'Malta', continent: 'Europe' },
  { code: 'MU', name: 'Mauritius', continent: 'Africa' },
  { code: 'MV', name: 'Maldives', continent: 'Asia' },
  { code: 'MW', name: 'Malawi', continent: 'Africa' },
  { code: 'MX', name: 'Mexico', continent: 'North America' },
  { code: 'MY', name: 'Malaysia', continent: 'Asia' },
  { code: 'MZ', name: 'Mozambique', continent: 'Africa' },
  { code: 'NA', name: 'Namibia', continent: 'Africa' },
  { code: 'NC', name: 'New Caledonia', continent: 'Oceania' },
  { code: 'NE', name: 'Niger', continent: 'Africa' },
  { code: 'NF', name: 'Norfolk Island', continent: 'Oceania' },
  { code: 'NG', name: 'Nigeria', continent: 'Africa' },
  { code: 'NI', name: 'Nicaragua', continent: 'North America' },
  { code: 'NL', name: 'Netherlands', continent: 'Europe' },
  { code: 'NO', name: 'Norway', continent: 'Europe' },
  { code: 'NP', name: 'Nepal', continent: 'Asia' },
  { code: 'NR', name: 'Nauru', continent: 'Oceania' },
  { code: 'NU', name: 'Niue', continent: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania' },
  { code: 'OM', name: 'Oman', continent: 'Asia' },
  { code: 'PA', name: 'Panama', continent: 'North America' },
  { code: 'PE', name: 'Peru', continent: 'South America' },
  { code: 'PF', name: 'French Polynesia', continent: 'Oceania' },
  { code: 'PG', name: 'Papua New Guinea', continent: 'Oceania' },
  { code: 'PH', name: 'Philippines', continent: 'Asia' },
  { code: 'PK', name: 'Pakistan', continent: 'Asia' },
  { code: 'PL', name: 'Poland', continent: 'Europe' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', continent: 'North America' },
  { code: 'PN', name: 'Pitcairn', continent: 'Oceania' },
  { code: 'PR', name: 'Puerto Rico', continent: 'North America' },
  { code: 'PS', name: 'Palestine', continent: 'Asia' },
  { code: 'PT', name: 'Portugal', continent: 'Europe' },
  { code: 'PW', name: 'Palau', continent: 'Oceania' },
  { code: 'PY', name: 'Paraguay', continent: 'South America' },
  { code: 'QA', name: 'Qatar', continent: 'Asia' },
  { code: 'RE', name: 'Réunion', continent: 'Africa' },
  { code: 'RO', name: 'Romania', continent: 'Europe' },
  { code: 'RS', name: 'Serbia', continent: 'Europe' },
  { code: 'RU', name: 'Russia', continent: 'Europe' },
  { code: 'RW', name: 'Rwanda', continent: 'Africa' },
  { code: 'SA', name: 'Saudi Arabia', continent: 'Asia' },
  { code: 'SB', name: 'Solomon Islands', continent: 'Oceania' },
  { code: 'SC', name: 'Seychelles', continent: 'Africa' },
  { code: 'SD', name: 'Sudan', continent: 'Africa' },
  { code: 'SE', name: 'Sweden', continent: 'Europe' },
  { code: 'SG', name: 'Singapore', continent: 'Asia' },
  { code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha', continent: 'Africa' },
  { code: 'SI', name: 'Slovenia', continent: 'Europe' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', continent: 'Europe' },
  { code: 'SK', name: 'Slovakia', continent: 'Europe' },
  { code: 'SL', name: 'Sierra Leone', continent: 'Africa' },
  { code: 'SM', name: 'San Marino', continent: 'Europe' },
  { code: 'SN', name: 'Senegal', continent: 'Africa' },
  { code: 'SO', name: 'Somalia', continent: 'Africa' },
  { code: 'SR', name: 'Suriname', continent: 'South America' },
  { code: 'SS', name: 'South Sudan', continent: 'Africa' },
  { code: 'ST', name: 'Sao Tome and Principe', continent: 'Africa' },
  { code: 'SV', name: 'El Salvador', continent: 'North America' },
  { code: 'SX', name: 'Sint Maarten', continent: 'North America' },
  { code: 'SY', name: 'Syria', continent: 'Asia' },
  { code: 'SZ', name: 'Eswatini', continent: 'Africa' },
  { code: 'TC', name: 'Turks and Caicos Islands', continent: 'North America' },
  { code: 'TD', name: 'Chad', continent: 'Africa' },
  { code: 'TF', name: 'French Southern Territories', continent: 'Antarctica' },
  { code: 'TG', name: 'Togo', continent: 'Africa' },
  { code: 'TH', name: 'Thailand', continent: 'Asia' },
  { code: 'TJ', name: 'Tajikistan', continent: 'Asia' },
  { code: 'TK', name: 'Tokelau', continent: 'Oceania' },
  { code: 'TL', name: 'Timor-Leste', continent: 'Asia' },
  { code: 'TM', name: 'Turkmenistan', continent: 'Asia' },
  { code: 'TN', name: 'Tunisia', continent: 'Africa' },
  { code: 'TO', name: 'Tonga', continent: 'Oceania' },
  { code: 'TR', name: 'Türkiye', continent: 'Asia' },
  { code: 'TT', name: 'Trinidad and Tobago', continent: 'North America' },
  { code: 'TV', name: 'Tuvalu', continent: 'Oceania' },
  { code: 'TW', name: 'Taiwan', continent: 'Asia' },
  { code: 'TZ', name: 'Tanzania', continent: 'Africa' },
  { code: 'UA', name: 'Ukraine', continent: 'Europe' },
  { code: 'UG', name: 'Uganda', continent: 'Africa' },
  { code: 'UM', name: 'United States Minor Outlying Islands', continent: 'Oceania' },
  { code: 'US', name: 'United States of America', continent: 'North America' },
  { code: 'UY', name: 'Uruguay', continent: 'South America' },
  { code: 'UZ', name: 'Uzbekistan', continent: 'Asia' },
  { code: 'VA', name: 'Holy See', continent: 'Europe' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', continent: 'North America' },
  { code: 'VE', name: 'Venezuela', continent: 'South America' },
  { code: 'VG', name: 'British Virgin Islands', continent: 'North America' },
  { code: 'VI', name: 'United States Virgin Islands', continent: 'North America' },
  { code: 'VN', name: 'Vietnam', continent: 'Asia' },
  { code: 'VU', name: 'Vanuatu', continent: 'Oceania' },
  { code: 'WF', name: 'Wallis and Futuna', continent: 'Oceania' },
  { code: 'WS', name: 'Samoa', continent: 'Oceania' },
  { code: 'XK', name: 'Kosovo', continent: 'Europe' },
  { code: 'YE', name: 'Yemen', continent: 'Asia' },
  { code: 'YT', name: 'Mayotte', continent: 'Africa' },
  { code: 'ZA', name: 'South Africa', continent: 'Africa' },
  { code: 'ZM', name: 'Zambia', continent: 'Africa' },
  { code: 'ZW', name: 'Zimbabwe', continent: 'Africa' },
]

const BY_CODE: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((country) => [country.code, country]),
)

/** Restituisce il Paese per codice ISO alpha-2, o `undefined` se non è nella lista. */
export function getCountry(code: string | null | undefined): Country | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined
}

/** `true` se il codice appartiene alla fonte di verità. */
export function isKnownCountryCode(code: string | null | undefined): boolean {
  return getCountry(code) !== undefined
}

/** Numero totale di Paesi tracciabili (Stati sovrani + territori). */
export const TOTAL_COUNTRIES = COUNTRIES.length

/**
 * I 195 Stati riconosciuti dall'ONU: 193 membri più 2 osservatori
 * permanenti (Santa Sede e Palestina).
 *
 * È il denominatore di "X/195" e della percentuale di mondo visitato: è il
 * conteggio che la gente ha in testa quando dice "quanti Paesi hai visto".
 * Gli altri 55 codici di `COUNTRIES` sono territori e dipendenze: restano
 * cliccabili e tracciabili, ma contati a parte.
 *
 * Anche questo elenco è dati, non un numero magico: il 195 si ricava dalla
 * lunghezza, e un test verifica che ogni codice esista in `COUNTRIES`.
 */
const UN_MEMBER_LIST: readonly string[] = [
  // Africa (54)
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD',
  'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE',
  'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG',
  'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG',
  'ZM', 'ZW',
  // Asia (47)
  'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CY', 'GE', 'IN', 'ID',
  'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MY', 'MV', 'MN',
  'MM', 'NP', 'KP', 'KR', 'OM', 'PK', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TJ',
  'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
  // Europa (43)
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC',
  'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES',
  'SE', 'CH', 'UA', 'GB',
  // Nord America (23)
  'AG', 'BS', 'BB', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'SV', 'GD', 'GT', 'HT',
  'HN', 'JM', 'MX', 'NI', 'PA', 'KN', 'LC', 'VC', 'TT', 'US',
  // Sud America (12)
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE',
  // Oceania (14)
  'AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV',
  'VU',
  // Osservatori permanenti (2)
  'VA', 'PS',
]

export const UN_MEMBER_CODES: ReadonlySet<string> = new Set(UN_MEMBER_LIST)

/** Denominatore di "X/195". Ricavato dai dati, non scritto a mano. */
export const TOTAL_UN_MEMBERS = UN_MEMBER_CODES.size

/** `true` per i 195 Stati ONU; `false` per territori e dipendenze. */
export function isUnMember(code: string | null | undefined): boolean {
  return code ? UN_MEMBER_CODES.has(code.toUpperCase()) : false
}

/** Paesi raggruppati per continente, calcolati dalla fonte di verità. */
export const COUNTRIES_BY_CONTINENT: Readonly<Record<Continent, readonly Country[]>> =
  COUNTRIES.reduce(
    (acc, country) => {
      acc[country.continent].push(country)
      return acc
    },
    {
      Africa: [],
      Asia: [],
      Europe: [],
      'North America': [],
      'South America': [],
      Oceania: [],
      Antarctica: [],
    } as Record<Continent, Country[]>,
  )
