/**
 * Il dataset geografico dell'app. Unico, committato, mai da CDN esterni.
 *
 * Natural Earth 50m admin-0 countries. La scelta è documentata in CLAUDE.md,
 * "Decisioni prese": il 110m lasciava 29 Stati ONU senza geometria, quindi
 * incliccabili sul globo.
 *
 * Questa costante è la fonte di verità del percorso: l'app la usa per la
 * fetch e i test per leggere lo stesso file dal disco. Cambiare dataset
 * significa cambiare qui e vedere i test parlare.
 */
export const GEOJSON_FILENAME = 'countries-50m.geojson'

/** Percorso relativo alla root pubblica, senza base URL. */
export const GEOJSON_PUBLIC_PATH = `data/${GEOJSON_FILENAME}`
