import type { MessageKey, TranslationVars } from './translate'

/**
 * Un messaggio destinato all'utente, non ancora tradotto.
 *
 * Lo store e i validatori non parlano nessuna lingua: producono chiavi, e chi
 * disegna decide in che lingua leggerle. Con delle stringhe gia tradotte in
 * stato, cambiare lingua non cambierebbe i messaggi gia prodotti.
 */
export interface LocalizedMessage {
  key: MessageKey
  vars?: TranslationVars
}
