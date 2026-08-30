# World Travel Tracker

**See where you've been. Discover where you'll go next.**

App personale per tracciare i Paesi visitati su un mappamondo 3D interattivo.
Nessun account, nessun server, nessuna chiamata di rete a runtime: tutto vive
nel browser, sul dispositivo di chi la usa. Installabile come PWA e
funzionante offline dopo il primo caricamento.

---

## Cosa fa

- **Mappamondo 3D interattivo** — 242 Paesi e territori cliccabili, rotazione
  e zoom, evidenziazione al passaggio del puntatore. I Paesi visitati si
  accendono con il colore accento, con una transizione morbida.
- **Paesi** — elenco completo con ricerca per nome o codice ISO, filtro per
  stato di visita e per continente.
- **Viaggi** — piu visite per Paese, ciascuna con data, citta, nota e una
  foto. Timeline raggruppata per anno.
- **Statistiche** — copertura per continente con barre di avanzamento, elenco
  di cosa resta da vedere, distribuzione dei viaggi per anno.
- **Achievement** — sette traguardi che si sbloccano da soli, dal primo Paese
  al mondo intero.
- **Impostazioni** — export e import del backup in JSON, reset completo.

---

## Stack

| | |
|---|---|
| UI | React 18.3.1 (**non** 19: react-globe.gl richiede React 18 come peer) |
| Linguaggio | TypeScript 5.9 in `strict` |
| Build | Vite 8 |
| Stile | Tailwind CSS v3 |
| Globo | react-globe.gl 2.38 -> globe.gl -> three-globe -> three 0.185.1 |
| Stato | Zustand 5 |
| Persistenza | Dexie 4 su IndexedDB |
| Routing | react-router-dom 7 |
| PWA | vite-plugin-pwa 1.3 (Workbox) |
| Icone | lucide-react |
| Test | Vitest 4 + Testing Library + fake-indexeddb |

Una sola copia di `three` nel bundle: verificabile con `npm ls three`.

---

## Installazione e sviluppo

```bash
npm install
npm run dev              # server di sviluppo
npm run dev -- --host    # raggiungibile dal telefono sulla stessa rete
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo con hot reload |
| `npm run build` | Typecheck, build di produzione **e verifica del precache** |
| `npm run preview` | Serve la build di produzione |
| `npm test` | Suite completa Vitest |
| `npm run test:watch` | Test in watch mode |
| `npm run typecheck` | Solo `tsc --noEmit` |
| `npm run icons` | Rigenera le icone PWA da `scripts/generate-icons.mjs` |

La build fallisce se il GeoJSON o un chunk restano fuori dal precache: vedi
[Verifica del precache](#verifica-del-precache).

---

## Deploy su Vercel

Progetto statico, nessuna variabile d'ambiente.

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`

`vercel.json` fa due cose necessarie:

1. **Rewrite `/(.*)` -> `/index.html`.** Senza, aprire direttamente
   `/statistics` o ricaricare una pagina interna da un 404: il routing e
   lato client e il server non conosce quei percorsi. Il rewrite scatta solo
   se nessun file reale corrisponde, quindi `/sw.js` e `/data/...` continuano
   a essere serviti come file.
2. **`Cache-Control: immutable` su `/data/*.geojson`.** Il dataset non cambia
   mai a parita di nome, e il nome vive in `src/data/countries/dataset.ts`:
   cambiare dataset significa cambiare file, quindi la cache si invalida da
   se. **Se un giorno si modificasse il contenuto senza rinominare il file,
   questo header lo congelerebbe per un anno nei browser.** Rinominare,
   sempre.

`sw.js`, `index.html` e `manifest.webmanifest` hanno invece `max-age=0,
must-revalidate`: sono i file che devono poter cambiare perche un
aggiornamento arrivi.

---

## PWA e offline

Dopo il primo caricamento l'app funziona senza rete: globo compreso.

- **Manifest**: `World Travel Tracker` / `Travel Tracker`, display
  `standalone`, tema `#05070c`, icone 192 e 512 piu le rispettive maskable.
- **Precache**: 23 voci, ~5,2 MB, generate da Workbox.
- **`maximumFileSizeToCacheInBytes` a 5 MB**: il default di Workbox e 2 MB e
  il GeoJSON da solo ne pesa 3.
- **`navigateFallback: index.html`**: i link profondi funzionano anche
  offline.

### Aggiornamenti

`registerType: 'prompt'`. Quando esce una versione nuova, il service worker
la scarica in silenzio e resta in attesa; in basso compare un avviso con un
bottone **Reload**. Non si ricarica da soli: farlo mentre qualcuno sta
scrivendo la nota di un viaggio significherebbe buttarla via. Rimandando,
l'avviso torna al prossimo avvio — non serve mai svuotare la cache a mano.

### Verifica del precache

`npm run build` esegue `scripts/check-precache.mjs`, che stampa il manifest
Workbox e fallisce se:

- un file della build non e finito nel precache (tipicamente per il limite di
  dimensione, che Workbox applicava in silenzio);
- una voce del precache punta a un file che non esiste (l'installazione del
  service worker fallirebbe, e con essa tutto l'offline);
- un URL compare due volte con revision diverse.

### Contesto sicuro

I service worker esistono **solo in contesto sicuro**: HTTPS oppure
`localhost`. Su un server di sviluppo raggiunto via IP di rete
(`http://192.168.1.5:5173`) il service worker **non si registra**, quindi da
li l'offline non e collaudabile. Per provarlo davvero servono `localhost` o
il sito deployato.

---

## Dove vivono i dati

Tutto in **IndexedDB**, sul dispositivo. Nessun account, nessun server,
nessuna sincronizzazione — il che significa anche che nessuno puo
recuperarli al posto tuo.

| Tabella | Contenuto |
|---|---|
| `manuallyMarked` | Paesi segnati come visitati a mano |
| `visits` | I viaggi: Paese, data, citta, nota, riferimento alla foto |
| `photos` | Le foto come `Blob`, mai in base64 |
| `datasets` | Copia locale del GeoJSON, per non riscaricarlo a ogni avvio |

Nessun componente parla con Dexie direttamente: si passa sempre da
`src/services/storage/`, e un test (`storageLayer.test.ts`) fallisce se
qualcuno importa `db.ts` da fuori.

All'avvio si chiama `navigator.storage.persist()`: senza, iOS Safari puo
cancellare IndexedDB dopo circa una settimana di inattivita.

Se IndexedDB non e disponibile — Safari in navigazione privata — l'app non si
blocca: parte vuota, avvisa con un banner che le modifiche andranno perse
chiudendo la scheda, e lascia comunque lavorare.

---

## Import / export

**Export** produce `world-travel-tracker-backup.json` con un campo
`formatVersion`. **Le foto non entrano nel backup**, e l'app lo dice prima
del bottone, non dopo il download: restano `Blob` in IndexedDB, e un JSON con
le immagini dentro sarebbe enorme.

**Import sostituisce, non fonde.** Un backup e la fotografia di uno stato e
ripristinarlo deve restituire quello stato; fondere lascerebbe in giro voci
gia cancellate, senza modo di tornare indietro. L'app lo dice due volte prima
di farlo: un avviso sopra il selettore del file e una modal di conferma che
elenca cosa arriva e cosa va perso.

La validazione precede qualunque scrittura: `parseTravelDataJson` e puro e
non apre nemmeno il database. Un file non valido lascia i dati intatti perche
non li ha mai toccati, non perche si fa un rollback.

**Reset** cancella marcatori, viaggi **e foto**. Non tocca la copia locale del
GeoJSON: non sono dati dell'utente, e cancellarla vorrebbe dire riscaricare
3 MB per aver chiesto di dimenticare i propri viaggi.

---

## Struttura

```
public/
  data/countries-50m.geojson    dataset Natural Earth 50m, committato
  icons/                        icone PWA generate da script
scripts/
  generate-icons.mjs            rigenera le icone, senza dipendenze
  check-precache.mjs            verifica il precache dopo la build
src/
  components/
    Achievements/ CountryDetails/ CountryList/ Globe/
    Navigation/ Stats/ Timeline/ UI/
  data/countries/               dataset, elenco ISO, resolver, riduzione geometrica
  hooks/
  pages/                        Home, Countries, Trips, Statistics, Achievements, Settings
  services/storage/             unico punto di accesso a Dexie
  store/                        Zustand + selettori derivati
  styles/  types/  utils/
```

Layer separati: UI / stato / storage / dati geografici / utility / tipi.

---

## Decisioni prese

Le motivazioni complete stanno in `CLAUDE.md`, sezione "Decisioni prese".
Le tre che spiegano piu codice di tutte:

### Dataset Natural Earth 50m

Non il 110m. Il motivo non e la resa dei contorni ma un buco funzionale: nel
110m **29 Stati ONU non hanno geometria** — Malta, Singapore, Monaco,
Vaticano, Bahrain, Maldive, Andorra, San Marino e altri micro-Stati — quindi
sul globo non esistono e non si possono cliccare. Col 50m la copertura passa
da 166/195 a **195/195**, al prezzo di 2,9 MB invece di 0,8.

Il nome del file vive in `src/data/countries/dataset.ts`. App, test, config di
build e script leggono quella costante: nessun percorso scritto a mano.

### Semplificazione della geometria a runtime

Costruire le mesh del 50m costava ~1.600 ms in un blocco sincrono, ed era li
che il globo si piantava al caricamento. Il costo cresce col **quadrato dei
vertici per anello**: il solo anello principale dell'Antartide, 2.805
vertici, valeva ~890 ms — piu della meta del mondo intero.

Due interventi: Douglas-Peucker con tolleranza 0,02 gradi (~2,2 km, sotto il
pixel alla vista di default) con un tetto di 800 vertici per anello, e la
consegna dei Paesi al globo **un gruppo per frame** invece che tutti insieme.
Risultato misurato: 99.613 -> 40.139 vertici, build delle mesh 1.613 -> 334 ms,
e nessun blocco del thread principale. La regola inviolabile: il poligono piu
grande di ogni feature non si scarta mai, e un test verifica che tutti e 195
gli Stati ONU conservino la geometria.

### Il denominatore e 195

Tutte le percentuali e i totali si calcolano su `UN_MEMBER_LIST` in
`src/data/countries/countries.ts` — 193 membri ONU piu Santa Sede e
Palestina. **Mai contando le feature del GeoJSON**, che sono 242, includono
territori e dipendenze e in un caso danno lo stesso codice a piu feature.

I territori visitati (Groenlandia, Porto Rico, ...) si contano a parte e non
fanno avanzare gli achievement: avere "50 / 195" e "World Traveler a 50" con
due numeri diversi dietro sarebbe una contraddizione sulla stessa schermata.

---

## Qualita

- `npx tsc --noEmit` e `npm run build` devono passare puliti.
- Oltre 400 test Vitest sulla logica pura e sui componenti: statistiche,
  achievement, validazione dell'import, resolver ISO, riduzione geometrica,
  cache, accessibilita delle modal, contrasto della palette.
- I test sul globo usano un doppio della libreria, perche montare
  react-globe.gl richiede WebGL. Il buco lo copre
  `globeAccessors.test.tsx`, che monta il `GlobeView` reale e verifica che
  ogni accessor passato a `<Globe>` restituisca il tipo giusto per ognuno dei
  242 poligoni. **Ogni nuovo accessor va aggiunto a quel test**, altrimenti il
  contratto con la libreria non e verificato da niente.
- Le interazioni col globo non sono mai dichiarate "verificate": si collaudano
  a mano.

---

## Licenza

Progetto personale. Il dataset geografico e
[Natural Earth](https://www.naturalearthdata.com/), di pubblico dominio.
