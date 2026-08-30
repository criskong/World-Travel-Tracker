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
feature. Non è stata adottata come file: un file derivato da rigenerare a mano
a ogni aggiornamento del dataset non vale 0,46 MB di gzip risparmiati.
Il mobile poi ha sofferto davvero, e la semplificazione è stata fatta **a
runtime** — stessa densità, nessun file derivato. Vedi la decisione qui
sotto.

### Caricamento del globo: riduzione a runtime e comparsa progressiva (dopo la fase 4)

Col 50m il globo su telefono ci metteva molto ad apparire e poi si bloccava.
Profilo misurato del caricamento (desktop, dataset intero):

| | |
|---|---|
| `JSON.parse` | 22 ms |
| risoluzione ISO + riduzione | ~15 ms |
| **costruzione delle mesh** | **~1.600 ms, in un unico blocco sincrono** |

Il costo non sta nel parsing né nel numero di poligoni: sta in
`ConicPolygonGeometry`, che three-globe costruisce **in modo sincrono** dentro
l'update del layer, e che costa il **quadrato dei vertici per anello**.
L'anello principale dell'Antartide, 2.805 vertici, da solo valeva ~890 ms —
più della metà del mondo. Da qui due interventi indipendenti.

**1. Riduzione della geometria a runtime** (`geometrySimplify.ts`).
Douglas-Peucker con tolleranza `0,02°` (~2,2 km: il globo disegna ~40 km per
pixel, quindi sotto il pixel alla vista di default), più un tetto di 800
vertici per anello — sopra il tetto la tolleranza raddoppia finché l'anello
non rientra. Il tetto serve al caso peggiore: un anello è indivisibile, quindi
il più grande è il blocco più lungo che il thread principale non può spezzare.

È la "via di riserva" già prevista qui sopra, applicata però a runtime: la
densità che ne esce (40.139 vertici) è quella del mapshaper 40% (41.194), ma
il dataset committato resta uno solo e la riduzione è codice con test. L'unica
obiezione registrata contro mapshaper — il file derivato da rigenerare a mano —
qui non esiste.

Misurato: 99.613 → 40.139 vertici, anello più grande 4.574 → 799, costruzione
mesh **1.613 → 334 ms**, costo della riduzione stessa 14 ms.

**2. Comparsa progressiva** (`loadPlan.ts` + `useProgressiveReveal.ts`).
I Paesi arrivano a `polygonsData` un gruppo per frame invece che tutti insieme:
lo stesso lavoro totale diventa una sequenza di blocchi corti con un paint in
mezzo, il globo resta girevole e i Paesi compaiono a ondate. 25 gruppi, il più
lento 122 ms (l'Antartide, che è indivisibile).

L'ordine è per area decrescente: prima i continenti, poi gli arcipelaghi,
ultimi i micro-Stati. Una feature che da sola sfonda il budget prende un gruppo
tutto suo ma **resta al suo posto nell'ordine**: spostare i giganti in coda
proteggerebbe la fluidità al prezzo di veder comparire per ultimi Russia,
Canada e Stati Uniti.

Tre vincoli da non rompere:

- La riduzione **non può far sparire nessuno**: il poligono più grande di ogni
  feature non si scarta mai e nessun anello scende sotto il triangolo. Un test
  verifica che tutti e 195 gli Stati ONU conservino la geometria — è il motivo
  per cui siamo passati al 50m.
- `dropTinyIslands` e `simplifyGeometry` restituiscono **lo stesso oggetto**
  quando non cambiano niente, poligono per poligono: three-globe confronta
  `coords` per identità e ricostruirebbe la mesh a ogni update.
- `useProgressiveReveal` deve invece dare un **array nuovo** a ogni consegna:
  react-kapsule riapplica una prop solo se ne cambia l'identità.

**3. Nessun indicatore di caricamento.** Non c'è nessuno spinner, nessuna
percentuale, nessun pannello sopra il globo: l'unica cosa che dice che sta
caricando è il mappamondo che prende forma. Ci si è arrivati per gradi — prima
un pannello con un aereo e un contatore "142 / 242", poi solo il pannello
durante il download — e ogni volta il verdetto è stato che era di troppo. Con
il dataset in cache l'attesa è di pochi millisecondi, e un indicatore che
appare e sparisce nello stesso respiro si nota più di uno che non c'è.

Il prezzo, accettato consapevolmente: **alla primissima apertura**, mentre
scarica i 3 MB, si vede una sfera senza Paesi e senza spiegazioni. Succede una
volta sola per dispositivo. Non reintrodurre uno spinner per questo caso senza
chiederlo prima.

Resta invece il messaggio d'errore in fondo allo schermo quando il dataset non
si carica affatto: quello non è un indicatore di attesa, è l'unica cosa che
distingue "sta arrivando" da "non arriverà".

**4. Copia locale del dataset** (`services/storage/geoDataset.ts`, tabella
Dexie `datasets`, schema v2). Il GeoJSON non cambia mai fra un avvio e
l'altro: riscaricarlo a ogni apertura era la parte più lenta del caricamento e,
su rete mobile, l'unica che costa davvero. La chiave è il nome del file, quindi
cambiare dataset invalida la cache da sé, senza versioni da ricordarsi di
alzare; all'avvio successivo la copia vecchia viene buttata.

Tre proprietà che i test verificano una per una:

- **È una cache, non una fonte di verità.** Nessuna di quelle funzioni lancia
  mai: senza storage restituiscono `null` o `false` e l'app riscarica come
  prima. Un'ottimizzazione non può impedire al globo di comparire.
- **Una copia corrotta si butta e si riscarica.** Senza questa via d'uscita
  una cache rovinata renderebbe l'app inutilizzabile per sempre, e l'utente
  non avrebbe modo né di accorgersene né di rimediare.
- **La scrittura è rimandata a thread libero** (`requestIdleCallback`).
  Scrivere 3 MB su IndexedDB mentre three-globe costruisce le mesh vorrebbe
  dire contendersi lo stesso thread nel momento peggiore.

`resetData` NON la tocca: non sono dati dell'utente, è contenuto dell'app.
Cancellarla costringerebbe a riscaricare 3 MB per aver chiesto di dimenticare
i propri viaggi.

Resta fuori dalla portata della cache il costo che nessun archivio elimina:
la **costruzione delle mesh**, ~334 ms su desktop, perché è geometria WebGL e
va ricostruita a ogni avvio. In fase 6 andrà aggiunto anche l'header
`Cache-Control: immutable` su `/data/*.geojson`, che è la stessa cosa fatta
dal lato HTTP.

### Achievement e gestione dei dati (decise in fase 5)

**I territori non contano per gli achievement.** Le soglie — First Step 1,
Explorer 10, Travel Addict 25, World Traveler 50, Globe Trotter 100, World
Explorer 195 — guardano solo `UN_MEMBER_LIST`, e anche Continent Master
considera completo un continente quando sono visitati tutti i suoi Stati ONU.
Il motivo: il denominatore mostrato ovunque è 195, e far contare Groenlandia o
Porto Rico renderebbe "50 / 195" e "World Traveler a 50" due numeri che si
contraddicono sulla stessa schermata. I territori visitati restano contati a
parte, come in Home: non spariscono, non fanno avanzare le medaglie.

Corollario: `COUNTRIES_BY_CONTINENT` include i territori, quindi ogni conteggio
per continente va filtrato su `UN_MEMBER_CODES`. Un test verifica che la somma
dei totali per continente faccia esattamente 195; se qualcuno togliesse il
filtro, quel test cade.

**Gli achievement non si persistono mai.** Sono stato derivato come
`isVisited`: `computeAchievements` li ricalcola a ogni render. Effetto voluto e
gratuito: importare un backup rimette a posto anche le medaglie.

**L'import SOSTITUISCE, non fonde.** Un backup è la fotografia di uno stato, e
ripristinarlo deve restituire esattamente quello stato; una fusione lascerebbe
in giro voci che l'utente aveva cancellato, senza modo di tornare indietro. La
UI lo dice due volte prima che succeda: un avviso sopra il selettore del file,
e la modal di conferma che elenca cosa arriva e cosa va perso.

**La validazione precede qualunque scrittura.** `parseTravelDataJson` (puro,
non tocca il database) prende il testo del file e decide; solo se passa si
apre la conferma, e solo dopo la conferma si scrive. Un file non valido lascia
i dati esistenti intatti perché non si è mai arrivati a toccarli, non perché
si fa rollback.

**Le foto non entrano nel backup**, e la UI lo dice PRIMA del bottone di
export, non dopo il download. Restano `Blob` in IndexedDB: un JSON con le
immagini in base64 sarebbe enorme e violerebbe il vincolo "mai base64".
Per contro `resetData` le cancella insieme al resto: nessun Blob orfano.

### PWA, aggiornamenti e persistenza del globo (fase 6)

**Il globo non passa dall'`<Outlet>`.** Home e montata stabilmente in
`AppLayout` e viene solo nascosta quando si naviga altrove. Con la Home dentro
l'Outlet, react-router la smontava a ogni cambio pagina e tornare sulla home
significava ricostruire 610 mesh e un contesto WebGL da capo: ~300 ms su
desktop, molti di piu su telefono, ogni volta. Conseguenze da tenere presenti:

- `<Route index element={null} />` non e una svista: la rotta serve solo a far
  combaciare `/` con il layout.
- `GlobeView` conserva l'ultima dimensione valida, perche a Home nascosta il
  contenitore misura 0x0 e smontare `<Globe>` li vanificherebbe tutto.
- Le stesse misure a zero fanno da segnale di "non si vede": il ciclo di
  rendering si mette in pausa da solo. Non serve passare nessuna prop.
- `AppLayout.test.tsx` conta i montaggi e fallisce se il globo si rimonta.

**Aggiornamento del service worker: `prompt`, non `autoUpdate`.** La versione
nuova si scarica in silenzio e resta in attesa; l'utente decide quando
ricaricare. Un reload automatico mentre si sta scrivendo la nota di un viaggio
la butterebbe via.

**La build verifica il precache.** `scripts/check-precache.mjs` gira dentro
`npm run build`: stampa il manifest Workbox e fallisce se un file della build
ne resta fuori, se una voce punta a un file inesistente o se un URL compare
due volte con revision diverse. Serve perche il modo in cui l'offline si
rompe e sempre silenzioso.

**Niente `includeAssets`.** Quello che sta in `public/` finisce in `dist/` e lo
raccoglie gia `globPatterns`; elencarlo anche li produceva URL duplicati. Per
lo stesso motivo `png` e `webmanifest` non sono nei pattern: il manifest e le
icone che dichiara li aggiunge il plugin.

**Contrasto: mai `text-slate-500` o `text-slate-600`.** Misurati contro
`base-900` danno 4,23:1 e 2,66:1, sotto la soglia WCAG AA di 4,5:1 per il
testo normale. Al loro posto i token `muted` (6,29:1) e `subtle` (5,24:1).
`src/styles/palette.test.ts` ricontrolla i rapporti a ogni run: e facile
scrivere `text-slate-600` per abitudine e non accorgersi di niente guardando
lo schermo di un portatile al buio.

**`Cache-Control: immutable` su `/data/*.geojson` regge solo perche il nome
del file identifica il dataset.** Se un giorno se ne modificasse il contenuto
senza rinominarlo, quell'header lo congelerebbe per un anno nei browser.
Rinominare, sempre — la costante sta in `dataset.ts`.

### Domanda aperta: la doppia cache del GeoJSON (fase 6)

Con il precache del service worker attivo, il dataset e in cache due volte:
in Cache Storage (3,0 MB) e in IndexedDB via Dexie (3,0 MB). La copia Dexie e
anche **prima nel percorso critico**: `readDataset()` la interroga sempre,
anche quando il service worker risponderebbe da Cache Storage senza toccare
la rete.

Non e pero pura ridondanza: i service worker esistono solo in contesto sicuro,
quindi sul server di sviluppo raggiunto via IP di rete — cioe il modo in cui
l'app viene provata sul telefono — il service worker non c'e e Dexie e
l'unica cache.

Proposta non ancora applicata: saltare Dexie quando
`navigator.serviceWorker.controller` non e nullo, cioe quando il service
worker sta gia servendo la pagina. Toglie la duplicazione in produzione e
lascia la cache dove serve. **Da non implementare senza conferma.**

### Bilingue e installazione (dopo la fase 6)

**Inglese e italiano, senza librerie.** Due dizionari di oggetti letterali in
`src/i18n/`. `en.ts` e la fonte delle chiavi e `it.ts` e tipizzato come
`Record<keyof typeof en, string>`: **dimenticare una traduzione non produce una
stringa inglese a sorpresa in mezzo alla pagina, non compila**. Le chiavi che
finiscono con `#` sono plurali e si risolvono con `Intl.PluralRules`.

**Lo store e i validatori non parlano nessuna lingua.** Producono
`LocalizedMessage` — una chiave piu i suoi parametri — e chi disegna traduce.
Con delle stringhe gia tradotte in stato, cambiare lingua non cambierebbe i
messaggi gia prodotti. Vale anche per `achievements.ts`, che restituisce un
`detail` strutturato invece di una frase.

**I nomi dei Paesi in italiano arrivano da `Intl.DisplayNames`**, non da un
dizionario nostro: copre tutti e 250 i codici del nostro elenco (verificato da
un test) e i dati ICU sono nel browser, quindi funziona offline. In inglese si
usano invece i nomi curati di `countries.ts`, che restano la fonte di verita.
Un'insidia: per ICU `ZZ` e la "regione sconosciuta" e risponderebbe "Regione
sconosciuta" a un codice inventato — per questo si interroga `Intl` solo dopo
aver verificato che il codice esista in `countries.ts`.

Ricerca e ordinamento nella lista Paesi seguono la lingua, ma **la ricerca
accetta anche il nome inglese**: chi ha l'app in italiano e pensa in inglese
trova comunque la Germania digitando "Germany".

**La lingua e una preferenza, non un dato di viaggio.** Vive nella tabella
Dexie `preferences` (schema v3): non entra nel backup, e `resetData` non la
tocca. Azzerare i propri viaggi non deve rimettere l'app in inglese. Al primo
avvio si parte da `navigator.languages`, cosi un utente italiano non vede un
lampo di inglese in attesa di IndexedDB.

**Installazione: due mondi diversi, non uno.** Su Android e Chrome desktop il
browser lancia `beforeinstallprompt`; va intercettato con `preventDefault()` e
conservato, perche `prompt()` si puo chiamare UNA SOLA VOLTA e solo dentro un
gesto dell'utente. Su iOS quell'evento non esiste e non esistera: Safari
consente l'installazione solo dal menu Condividi, quindi l'unica cosa utile e
scrivere i passaggi. Il bottone in Impostazioni compare solo dove serve, e
dove l'app e gia installata lo dice invece di riproporsi.

### Archiviazione non disponibile (decisa in fase 2)

Quando IndexedDB non è utilizzabile (Safari in navigazione privata) l'app non
si blocca: si idrata a vuoto, mostra un banner che avvisa che le modifiche
andranno perse chiudendo la scheda, e lascia comunque operare l'utente in
memoria. Un globo inerte senza spiegazione sarebbe peggio del rischio di
perdere modifiche annunciate.

## Metodo di lavoro

Procedere per fasi, un commit per fase. Non anticipare fasi successive.
Fermarsi e chiedere se una scelta tecnica contraddice questa specifica.