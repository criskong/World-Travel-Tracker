import { useCallback, useEffect, useState } from 'react'

/**
 * Installazione della PWA.
 *
 * I browser non espongono un'API unica per "installa questa app": ce ne sono
 * due mondi diversi.
 *
 * - **Chrome, Edge, browser Android**: il browser decide quando l'app e
 *   installabile e lancia `beforeinstallprompt`. L'evento va intercettato e
 *   conservato, perche `prompt()` si puo chiamare UNA SOLA VOLTA e solo in
 *   risposta a un gesto dell'utente. Senza `preventDefault()` alcuni browser
 *   mostrano una loro barra e l'evento si perde.
 * - **iOS e iPadOS**: `beforeinstallprompt` non esiste e non esistera. Safari
 *   consente l'installazione solo dal menu Condividi, a mano. L'unica cosa
 *   utile che si puo fare e spiegare i passaggi.
 */

/** L'evento non e ancora nei tipi standard del DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  /** Gia installata: la pagina gira in modalita standalone. */
  | 'installed'
  /** Il browser ha offerto l'installazione: c'e un bottone da premere. */
  | 'available'
  /** iOS o iPadOS: si fa a mano, si mostrano le istruzioni. */
  | 'ios'
  /** Nessuna delle due: si spiega di usare il menu del browser. */
  | 'unavailable'

export interface InstallPrompt {
  state: InstallState
  /** `true` mentre il browser mostra la sua finestra di conferma. */
  busy: boolean
  /** Ha effetto solo quando `state` e `available`. */
  install: () => Promise<void>
  /** `true` se il browser su iOS non e Safari e quindi non puo installare. */
  iosNeedsSafari: boolean
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // `navigator.standalone` e la versione iOS, non standard ma l'unica li.
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS 13+ si dichiara "Macintosh": lo tradisce il touch.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}

/** Su iOS tutti i browser usano WebKit, ma solo Safari puo installare. */
function isIosNonSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return isIos() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent)
}

export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Senza questo alcuni browser mostrano la loro barra e l'evento sparisce.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred || busy) return
    setBusy(true)
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      // L'utente ha chiuso la finestra, o il browser ha rifiutato: non c'e
      // niente da dire, il bottone resta li.
    } finally {
      // L'evento e monouso: dopo il prompt non vale piu, comunque sia andata.
      setDeferred(null)
      setBusy(false)
    }
  }, [busy, deferred])

  const state: InstallState = installed
    ? 'installed'
    : deferred !== null
      ? 'available'
      : isIos()
        ? 'ios'
        : 'unavailable'

  return { state, busy, install, iosNeedsSafari: isIosNonSafari() }
}
