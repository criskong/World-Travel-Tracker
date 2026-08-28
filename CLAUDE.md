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

- Dataset: Natural Earth **50m** admin-0 countries, committato in
  `public/data/countries-50m.geojson`. Mai fetch da CDN esterni.
  Il nome del file vive in `src/data/countries/dataset.ts`: app e test leggono
  quella costante, mai un percorso scritto a mano.
- **Peso: ~3 MB non compressi**, ~1 MB gzip. Da tenere presente per il
  precache della PWA (fase 6) e per il primo caricamento su mobile.
- Il GeoJSON serve SOLO per la geometria.
- Fonte di verità per l'elenco dei Paesi: `src/data/countries/countries.ts`
  (lista ISO-3166-1 alpha-2 con nome e continente). Tutte le statistiche e i
  totali per continente si calcolano da QUESTA lista, mai contando le feature
  del GeoJSON (che sono 242, includono dipendenze e territori contesi, e in un
  caso assegnano lo stesso codice a più feature).
- Risoluzione del codice ISO di una feature, in un unico modulo
  `src/data/countries/isoResolver.ts`:
  `ISO_A2` → se `-99` o mancante, `ISO_A2_EH` → se ancora mancante, mapping
  manuale per nome. Casi noti da gestire: Francia, Norvegia, Kosovo,
  Somaliland, Cipro del Nord, Ghiacciaio del Siachen.
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

## Decisioni prese

Questioni già discusse e chiuse. Non riaprirle: implementarle così.

### Rimozione dello stato "visitato" (decisa in fase 2)

`isVisited` è derivato da `manuallyMarked` + `visits`, quindi togliere il
marcatore manuale non basta a rendere un Paese non visitato se ha viaggi
registrati. Il gesto è stato ridisegnato così:

- Il click su un Paese del globo **apre CountryDetails**. Dalla fase 4 non fa
  più toggle e non rimuove mai nulla.
- Lo stato "visitato" si toglie **solo** dal bottone esplicito dentro
  CountryDetails.
- Se il Paese ha viaggi registrati, quel bottone apre una **modal di conferma**
  che dice quanti viaggi verranno eliminati e li elenca.
- Se non ha viaggi, toglie il marcatore senza chiedere conferma.

La logica di conferma sta nella UI. `unmarkVisited` nello store resta
un'operazione elementare: toglie il marcatore manuale e non tocca i viaggi.

### Contratto con react-globe.gl (decisa in fase 3)

I test sul globo usano un **doppio della libreria**: montare react-globe.gl
davvero richiederebbe WebGL, che in jsdom non c'è. Conseguenza: da soli quei
test non verificano NIENTE di ciò che la libreria si aspetta da noi.

Il buco lo copre `src/components/Globe/globeAccessors.test.tsx`, che monta il
`GlobeView` reale, intercetta le props passate a `<Globe>` e verifica che ogni
accessor, applicato a ogni poligono del dataset, restituisca un valore del tipo
giusto senza lanciare.

**Ogni nuovo accessor passato a `<Globe>` va aggiunto a quel test**: se non c'è,
il contratto con la libreria non è verificato da nulla. Il test fallisce da sé
quando incontra una prop che non conosce, quindi non si può dimenticare.

Due dettagli che hanno già prodotto bug silenziosi, entrambi dovuti ad
`accessor-fn`, che three-globe usa per risolvere ogni accessor:

- Il default di `polygonGeoJsonGeometry` è la stringa `'geometry'`, cioè
  `polygon.geometry`. I nostri `CountryPolygon` hanno la geometria annidata in
  `feature`, quindi l'accessor va passato esplicitamente.
- Una **stringa** passata a un accessor non è un valore costante: è un NOME DI
  PROPRIETÀ. `polygonSideColor="rgba(...)"` significa `polygon['rgba(...)']`,
  cioè `undefined`. I valori costanti vanno passati come funzioni.

### Dataset geografico: Natural Earth 50m (decisa dopo la fase 4)

Si usa il **50m**, non il 110m. Il motivo non è la resa dei contorni ma un
buco funzionale: nel 110m **29 Stati ONU non hanno geometria** — Malta,
Singapore, Monaco, Vaticano, Bahrain, Maldive, Andorra, Liechtenstein,
San Marino e altri micro-Stati — quindi sul globo non esistono e non si
possono cliccare. Col 50m la copertura passa da 166/195 a **195/195**.

Numeri, misurati:

| | grezzo | gzip | feature | vertici | JSON.parse |
|---|---|---|---|---|---|
| 110m | 0,80 MB | 0,20 MB | 177 | 10.654 | ~5 ms |
| 50m | 2,94 MB | 0,97 MB | 242 | 99.613 | ~13 ms |

Due conseguenze da ricordare:

- `Siachen Glacier` esiste solo nel 50m ed è in `UNASSIGNED_TERRITORIES`:
  Natural Earth le dà `TYPE: "Indeterminate"` e `-99` su entrambi i campi ISO.
- Natural Earth assegna `ISO_A2: AU` anche alle dipendenze australiane
  (Indian Ocean Territories, Ashmore and Cartier), che nel 50m hanno feature
  proprie. È l'unica eccezione ammessa al vincolo "un codice, una feature", ed
  è dichiarata esplicitamente in `isoResolver.test.ts`: un duplicato diverso
  da quello fa fallire il test.

**Via di riserva se il mobile soffrisse**: `mapshaper -simplify 40% keep-shapes`
porta il file a 1,67 MB (0,51 gzip) e 41.194 vertici mantenendo tutte le 242
feature. Non è stata adottata: un file derivato da rigenerare a mano a ogni
aggiornamento del dataset non vale 0,46 MB di gzip risparmiati.

### Archiviazione non disponibile (decisa in fase 2)

Quando IndexedDB non è utilizzabile (Safari in navigazione privata) l'app non
si blocca: si idrata a vuoto, mostra un banner che avvisa che le modifiche
andranno perse chiudendo la scheda, e lascia comunque operare l'utente in
memoria. Un globo inerte senza spiegazione sarebbe peggio del rischio di
perdere modifiche annunciate.

## Metodo di lavoro

Procedere per fasi, un commit per fase. Non anticipare fasi successive.
Fermarsi e chiedere se una scelta tecnica contraddice questa specifica.