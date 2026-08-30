import { openDatabase } from './db'

/**
 * Preferenze dell'interfaccia.
 *
 * Non sono dati di viaggio: non entrano nel backup e `resetData` non le
 * tocca. Azzerare i propri viaggi non deve rimettere l'app in inglese.
 *
 * Come per la cache del dataset, niente qui lancia mai: senza archiviazione
 * la preferenza semplicemente non si ricorda, e l'app riparte dalla lingua
 * del sistema. Un problema di storage non puo impedire di usare l'app.
 */

const LANGUAGE_KEY = 'language'

export async function readStoredLanguage(): Promise<string | null> {
  try {
    const database = await openDatabase()
    const row = await database.preferences.get(LANGUAGE_KEY)
    return row?.value ?? null
  } catch {
    return null
  }
}

export async function writeStoredLanguage(value: string): Promise<boolean> {
  try {
    const database = await openDatabase()
    await database.preferences.put({ key: LANGUAGE_KEY, value })
    return true
  } catch {
    return false
  }
}

/** Solo per i test. */
export async function clearPreferences(): Promise<void> {
  try {
    const database = await openDatabase()
    await database.preferences.clear()
  } catch {
    // Niente da cancellare se il database non si apre.
  }
}
