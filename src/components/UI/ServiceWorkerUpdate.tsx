import { useCallback, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdateBanner } from './UpdateBanner'

/**
 * Registrazione del service worker e avviso di aggiornamento.
 *
 * SCELTA: `registerType: 'prompt'`, non `autoUpdate`. Un aggiornamento
 * automatico ricarica la pagina da solo appena il nuovo service worker è
 * pronto; se capita mentre si sta scrivendo la nota di un viaggio, quel testo
 * sparisce. Qui la nuova versione viene scaricata in silenzio e poi si chiede:
 * l'utente ricarica quando gli fa comodo. Rimandando, l'avviso torna al
 * prossimo avvio — non serve svuotare nessuna cache a mano.
 *
 * Questo componente è l'unico punto che tocca il modulo virtuale del plugin.
 * L'avviso vero è `UpdateBanner`, che è presentazionale e collaudabile da solo.
 */
export function ServiceWorkerUpdate() {
  const [busy, setBusy] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      // Un service worker che non si registra non è un motivo per rompere
      // l'app: senza, funziona tutto tranne l'offline.
      if (import.meta.env.DEV) console.warn('[pwa] registrazione fallita', error)
    },
  })

  const handleUpdate = useCallback(() => {
    setBusy(true)
    // `true` fa anche il reload della pagina una volta attivato il worker.
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  const handleDismiss = useCallback(() => {
    setNeedRefresh(false)
  }, [setNeedRefresh])

  return (
    <UpdateBanner
      visible={needRefresh}
      onUpdate={handleUpdate}
      onDismiss={handleDismiss}
      busy={busy}
    />
  )
}
