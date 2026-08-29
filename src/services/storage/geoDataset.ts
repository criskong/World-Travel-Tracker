import { openDatabase } from './db'

/**
 * Copia locale del dataset geografico.
 *
 * Il GeoJSON pesa ~3 MB non compressi e non cambia mai fra un avvio e
 * l'altro: riscaricarlo a ogni apertura della pagina è la parte più lenta
 * del caricamento, e su rete mobile è anche l'unica che costa davvero.
 *
 * REGOLA: questa è una cache, non una fonte di verità. Se lo storage non è
 * disponibile — Safari in navigazione privata, quota esaurita, permessi — le
 * funzioni qui sotto non lanciano mai: restituiscono `null` o non fanno
 * niente, e l'app riscarica il file come prima. Un errore di cache non deve
 * mai impedire al globo di comparire.
 *
 * La chiave è il nome del file: cambiare dataset invalida la cache da sé,
 * senza numeri di versione da ricordarsi di alzare.
 */

/** Il testo del dataset messo da parte, o `null` se non c'è o non si può leggere. */
export async function readCachedDataset(key: string): Promise<string | null> {
  try {
    const database = await openDatabase()
    const row = await database.datasets.get(key)
    return row?.text ?? null
  } catch {
    return null
  }
}

/** Mette da parte il dataset. Silenzioso in caso di errore, per progetto. */
export async function writeCachedDataset(key: string, text: string): Promise<boolean> {
  try {
    const database = await openDatabase()
    await database.datasets.put({
      key,
      text,
      bytes: text.length,
      cachedAt: new Date().toISOString(),
    })
    return true
  } catch {
    // Quota piena o storage assente: si riscaricherà la prossima volta.
    return false
  }
}

/**
 * Butta via le copie di dataset diversi da quello in uso.
 * Serve dopo un cambio di dataset: senza, la vecchia copia resterebbe a
 * occupare megabyte che nessuno leggerà più.
 */
export async function pruneCachedDatasets(keep: string): Promise<number> {
  try {
    const database = await openDatabase()
    const stale = await database.datasets.filter((row) => row.key !== keep).toArray()
    if (stale.length === 0) return 0
    await database.datasets.bulkDelete(stale.map((row) => row.key))
    return stale.length
  } catch {
    return 0
  }
}

/** Quanto occupa la copia locale, in byte. `0` se non c'è. */
export async function cachedDatasetSize(key: string): Promise<number> {
  try {
    const database = await openDatabase()
    const row = await database.datasets.get(key)
    return row?.bytes ?? 0
  } catch {
    return 0
  }
}

/** Cancella la copia locale. Solo per i test e per un eventuale comando esplicito. */
export async function clearCachedDatasets(): Promise<void> {
  try {
    const database = await openDatabase()
    await database.datasets.clear()
  } catch {
    // Niente da cancellare se il database non si apre.
  }
}
