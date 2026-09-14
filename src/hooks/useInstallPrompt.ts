import { useCallback, useState, useSyncExternalStore } from 'react'

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

/*
 * L'evento va catturato ALL'AVVIO, non quando si apre Impostazioni.
 *
 * Il browser lancia `beforeinstallprompt` una volta sola, poco dopo il
 * caricamento, mentre l'utente e ancora sulla Home. Un ascoltatore registrato
 * al montaggio della pagina Impostazioni arriva dopo che l'evento e passato:
 * il bottone non compariva alla prima apertura e compariva solo ricaricando
 * la pagina da dentro Impostazioni. Per questo lo stato vive fuori da React,
 * a livello di modulo, e `captureInstallPrompt()` si chiama da `main.tsx`.
 */
let deferredEvent: BeforeInstallPromptEvent | null = null
let installedFlag = false
let listening = false
const subscribers = new Set<() => void>()

function notify(): void {
  for (const subscriber of subscribers) subscriber()
}

/** Idempotente: mette in ascolto una volta sola, il prima possibile. */
export function captureInstallPrompt(): void {
  if (listening || typeof window === 'undefined') return
  listening = true

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

function onBeforeInstallPrompt(event: Event): void {
  // Senza questo alcuni browser mostrano la loro barra e l'evento sparisce.
  event.preventDefault()
  deferredEvent = event as BeforeInstallPromptEvent
  notify()
}

function onAppInstalled(): void {
  installedFlag = true
  deferredEvent = null
  notify()
}

/** Solo per i test: riporta il modulo allo stato di primo avvio, ascolto compreso. */
export function resetInstallPromptForTests(): void {
  deferredEvent = null
  installedFlag = false
  if (listening) {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
    listening = false
  }
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function useInstallPrompt(): InstallPrompt {
  // Se nessuno l'ha chiamata prima (i test, o un uso fuori da main.tsx) si
  // parte ad ascoltare da qui: tardi, ma meglio di niente.
  captureInstallPrompt()

  const deferred = useSyncExternalStore(subscribe, () => deferredEvent, () => null)
  const installed = useSyncExternalStore(
    subscribe,
    () => installedFlag || isStandalone(),
    () => false,
  )
  const [busy, setBusy] = useState(false)

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
      deferredEvent = null
      notify()
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
