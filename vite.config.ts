import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { GEOJSON_FILENAME } from './src/data/countries/dataset.ts'

/** 5 MB. Il default di Workbox e 2 MB e il GeoJSON da solo ne pesa ~3. */
const MAX_PRECACHE_FILE_BYTES = 5 * 1024 * 1024

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' e non 'autoUpdate': l'aggiornamento lo decide l'utente, con
      // un avviso in basso. Ricaricare da soli mentre qualcuno sta scrivendo
      // la nota di un viaggio significherebbe buttargliela via.
      registerType: 'prompt',

      /*
       * Niente `includeAssets`: quello che sta in `public/` finisce in `dist/`
       * e lo raccoglie gia `globPatterns`. Elencarlo anche li produceva otto
       * URL duplicati nel manifest, GeoJSON compreso — innocui solo finche le
       * revision coincidono, ma e una collisione che non ha motivo di esserci.
       */

      manifest: {
        name: 'World Travel Tracker',
        short_name: 'Travel Tracker',
        description: "See where you've been. Discover where you'll go next.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#05070c',
        theme_color: '#05070c',
        categories: ['travel', 'lifestyle', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        /*
         * Il GeoJSON e nominato esplicitamente oltre che coperto dal glob
         * generico: e il file che rende l'app utile offline, e un errore di
         * pattern lo farebbe sparire dal precache in silenzio.
         */
        /*
         * `png` e `webmanifest` non compaiono qui: il manifest e le icone che
         * dichiara li aggiunge gia il plugin, ed elencarli due volte riempiva
         * l'elenco di doppioni. Resta esplicita apple-touch-icon.png, che nel
         * manifest non c'e perche la referenzia solo l'HTML.
         * `scripts/check-precache.mjs` verifica dopo ogni build che non sia
         * rimasto fuori niente: se un pattern smette di bastare, la build
         * fallisce invece di produrre un offline a meta.
         */
        globPatterns: ['**/*.{js,css,html,svg}', `**/${GEOJSON_FILENAME}`, 'icons/apple-touch-icon.png'],
        /*
         * Senza questo, Workbox salta i file oltre 2 MB SENZA DIRE NIENTE:
         * il bundle di three.js e il GeoJSON resterebbero fuori e l'offline
         * non funzionerebbe, ma la build passerebbe verde (CLAUDE.md, PWA).
         */
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_FILE_BYTES,
        // Routing SPA offline: qualunque URL profondo torna su index.html.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/data\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    // I test di logica pura girano in node; quelli sui componenti dichiarano
    // `@vitest-environment jsdom` nel proprio docblock.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      /*
       * Il modulo virtuale lo genera vite-plugin-pwa a tempo di build: sotto
       * Vitest non esiste, e senza questo alias qualunque test che monti
       * `App` fallirebbe all'import.
       */
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterStub.ts', import.meta.url),
      ),
    },
  },
})
