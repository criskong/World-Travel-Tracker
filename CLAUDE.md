# World Travel Tracker — Specifica di progetto

App personale per tracciare i Paesi visitati. Mappamondo 3D interattivo,
100% client-side, installabile come PWA, deploy statico su Vercel.

Claim: "See where you've been. Discover where you'll go next."

## Vincoli non negoziabili

- Nessun login, account, backend, database remoto, chiamate di rete a runtime.
- Tutti i dati in IndexedDB via Dexie. I componenti UI NON accedono mai
  direttamente a Dexie: solo tramite `src/services/storage/`.
- Dopo il primo caricamento l'app deve funzionare completamente offline.
- Al primo avvio: 0 Paesi visitati. Nessun seed data, nessun dato finto.
- Ogni pulsante deve avere una funzione reale.

## Stack

React 18 (NON 19: react-globe.gl richiede peer dep React 18), TypeScript,
Vite, Tailwind CSS v3, react-globe.gl + three, Zustand, Dexie,
react-router-dom, vite-plugin-pwa, lucide-react.
Verificare la versione di `three` richiesta da react-globe.gl e allinearla.

## Dati geografici — punti critici

- Dataset: Natural Earth 110m admin-0 countries, committato in
  `public/data/countries-110m.geojson`. Mai fetch da CDN esterni.
- Il GeoJSON serve SOLO per la geometria.
- Fonte di verità per l'elenco dei Paesi: `src/data/countries/countries.ts`
  (lista ISO-3166-1 alpha-2 con nome e continente). Tutte le statistiche e i
  totali per continente si calcolano da QUESTA lista, mai contando le feature
  del GeoJSON (che sono ~258, includono dipendenze e territori contesi).
- Risoluzione del codice ISO di una feature, in un unico modulo
  `src/data/countries/isoResolver.ts`:
  `ISO_A2` → se `-99` o mancante, `ISO_A2_EH` → se ancora mancante, mapping
  manuale per nome. Casi noti da gestire: Francia, Norvegia, Kosovo,
  Somaliland, Cipro del Nord.
  Le feature non risolvibili si renderizzano come non interattive.

## Modello dati

```ts
interface Country { code: string; name: string; continent: Continent }
interface Visit {
  id: string; countryCode: string; date: string;
  city?: string; note?: string; photoId?: string;
}
```

Stato persistito: `manuallyMarked: string[]` + `visits: Visit[]`.
`isVisited(code)` è un SELETTORE derivato:
`manuallyMarked.includes(code) || visits.some(v => v.countryCode === code)`.
Non persistere mai lo stato derivato: unica fonte di verità.

Foto: salvate come `Blob` in una tabella Dexie separata, referenziate da
`photoId`. Mai base64 in IndexedDB.

## Architettura

```
src/
  components/{Globe,Dashboard,CountryList,CountryDetails,Stats,Timeline,Achievements,Navigation,UI}/
  pages/{Home,Countries,Trips,Statistics,Achievements,Settings}.tsx
  store/travelStore.ts
  services/storage/{db.ts,countries.ts,trips.ts,photos.ts}
  data/countries/
  hooks/  utils/  types/  assets/
```

Layer separati: UI / stato / storage / dati geografici / utility / tipi.

## PWA

- `workbox.maximumFileSizeToCacheInBytes` alzato a 5 MB, altrimenti il bundle
  three.js e il GeoJSON vengono saltati silenziosamente e l'offline non funziona.
- GeoJSON incluso esplicitamente in `includeAssets` / `globPatterns`.
- Chiamare `navigator.storage.persist()` all'avvio: su iOS Safari IndexedDB
  può essere evictata dopo ~7 giorni senza questo.
- manifest: name "World Travel Tracker", short_name "Travel Tracker",
  display standalone, theme color scuro.

## Design

Dark, premium, minimal, tecnologico. Il globo è il protagonista e occupa gran
parte della schermata. Paesi non visitati: grigi desaturati. Visitati: accent
color luminoso. Card con bordi arrotondati, ombre leggere, micro-animazioni.
Glassmorphism/blur SOLO su pannelli piccoli — mai su overlay a schermo intero
sopra il canvas WebGL (costo prestazionale su mobile).
Desktop: sidebar. Mobile: bottom navigation, safe-area insets gestite.

## Performance

Il globo non va ricreato quando cambia una statistica. GeoJSON parsato una
sola volta e memoizzato. Lazy loading del componente Globe, code splitting per
route, `React.memo`/`useMemo`/`useCallback` dove serve davvero.

## Qualità e verifica

- `npx tsc --noEmit` e `npm run build` devono passare puliti.
- Test Vitest sulla logica pura: calcolo statistiche, sblocco achievement,
  validazione dell'import JSON, resolver ISO.
- Non affermare mai che una funzionalità interattiva è "verificata": le
  interazioni col globo le collauda l'utente a mano.
- Errori mostrati all'utente in forma comprensibile, mai stack trace nell'UI.

## Metodo di lavoro

Procedere per fasi, un commit per fase. Non anticipare fasi successive.
Fermarsi e chiedere se una scelta tecnica contraddice questa specifica.