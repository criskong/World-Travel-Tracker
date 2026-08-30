/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/**
 * La configurazione di Tailwind è JavaScript e non ha tipi propri.
 * La legge `src/styles/palette.test.ts` per verificare il contrasto dei
 * colori: qui basta dichiarare la forma che quel test usa davvero.
 */
declare module '*/tailwind.config.js' {
  const config: {
    theme?: {
      extend?: {
        colors?: Record<string, unknown>
      }
    }
  }
  export default config
}
