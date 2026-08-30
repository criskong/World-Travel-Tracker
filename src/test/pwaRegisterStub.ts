/**
 * Sostituto di `virtual:pwa-register/react` nei test.
 *
 * Quel modulo lo crea vite-plugin-pwa a tempo di build: sotto Vitest non
 * esiste, e senza questo alias qualunque test che monti `App` fallirebbe
 * all'import. Lo stub dichiara "nessun aggiornamento in attesa", che è lo
 * stato normale, così i test misurano l'app e non il service worker.
 *
 * L'aggancio vive in `vite.config.ts`, sotto `test.alias`.
 */
export interface RegisterSWOptions {
  immediate?: boolean
  onRegisterError?: (error: unknown) => void
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
}

export function useRegisterSW(_options: RegisterSWOptions = {}) {
  return {
    needRefresh: [false, (_value: boolean) => {}] as [boolean, (value: boolean) => void],
    offlineReady: [false, (_value: boolean) => {}] as [boolean, (value: boolean) => void],
    updateServiceWorker: async (_reload?: boolean) => {},
  }
}
