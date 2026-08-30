import type { en } from './en'

/**
 * Dizionario italiano.
 *
 * Il tipo lo lega a `en`: una chiave mancante o di troppo e un errore di
 * compilazione, non una stringa inglese che spunta a sorpresa in produzione.
 */
export const it: Record<keyof typeof en, string> = {
  // --- Comune -------------------------------------------------------------
  'common.close': 'Chiudi',
  'common.cancel': 'Annulla',
  'common.tryAgain': 'Riprova',
  'common.delete': 'Elimina',
  'common.optional': '(facoltativo)',
  'common.visited': 'Visitato',
  'common.notVisited': 'Non visitato',
  'common.territory': 'Territorio',
  'common.territoryHint': 'Non è uno Stato membro ONU — non rientra nei 195',
  'common.trip#one': '{count} viaggio',
  'common.trip#other': '{count} viaggi',
  'common.country#one': '{count} Paese',
  'common.country#other': '{count} Paesi',
  'common.year#one': '{count} anno',
  'common.year#other': '{count} anni',
  'common.photo#one': '{count} foto',
  'common.photo#other': '{count} foto',

  // --- Continenti ---------------------------------------------------------
  'continent.Africa': 'Africa',
  'continent.Asia': 'Asia',
  'continent.Europe': 'Europa',
  'continent.North America': 'America del Nord',
  'continent.South America': 'America del Sud',
  'continent.Oceania': 'Oceania',
  'continent.Antarctica': 'Antartide',

  // --- Navigazione --------------------------------------------------------
  'nav.home': 'Home',
  'nav.home.description': 'Globo e riepilogo',
  'nav.countries': 'Paesi',
  'nav.countries.description': 'Tutti i Paesi',
  'nav.trips': 'Viaggi',
  'nav.trips.description': 'I tuoi viaggi',
  'nav.statistics': 'Statistiche',
  'nav.statistics.description': 'Numeri e grafici',
  'nav.achievements': 'Traguardi',
  'nav.achievements.description': 'Obiettivi sbloccati',
  'nav.settings': 'Impostazioni',
  'nav.settings.description': 'Dati e preferenze',
  'nav.sections': 'Sezioni',
  'nav.footer': 'Tutti i tuoi dati restano su questo dispositivo.',
  'nav.primary': 'Navigazione principale',

  // --- Home ---------------------------------------------------------------
  'home.title': 'World Travel Tracker',
  'home.tagline': 'Guarda dove sei stato. Scopri dove andrai.',
  'home.globe': 'Mappamondo interattivo',
  'home.globe.loading': 'Caricamento del globo…',
  'home.globe.failed': 'Non è stato possibile mostrare il globo',
  'home.globe.failedHint':
    'Il tuo browser potrebbe non supportare la grafica 3D, o potrebbe averla disattivata. Tutto il resto funziona: usa la pagina Paesi per segnare dove sei stato.',
  'home.globe.mapFailed': 'Caricamento della mappa non riuscito. Ricarica la pagina per riprovare.',

  // --- Statistiche della Home ---------------------------------------------
  'stats.section': 'Statistiche',
  'stats.countriesVisited': 'Paesi visitati',
  'stats.ofTheWorld': 'Del mondo',
  'stats.territories': 'Territori',
  'stats.beyondThe195': 'oltre i 195',
  'stats.byContinent': 'Per continente',
  'stats.empty.title': 'Il tuo mondo ti sta ancora aspettando',
  'stats.empty.body':
    'Fai girare il globo e tocca un Paese per aprirne i dettagli. Segnalo come visitato da lì, e i tuoi numeri compariranno qui.',
  'stats.empty.footer': '0 / 195 Paesi · 0% del mondo',
  'stats.continentBar': '{continent}: {visited} Paesi su {total}, {percentage}%',

  // --- Viaggi recenti -----------------------------------------------------
  'recent.title': 'Viaggi recenti',
  'recent.all': 'Tutti i viaggi',
  'recent.empty':
    'Nessun viaggio registrato. Aggiungine uno dai dettagli di un Paese per vederlo qui.',

  // --- Paesi --------------------------------------------------------------
  'countries.title': 'Paesi',
  'countries.subtitle': '{visited} su {total} tracciati · tocca un Paese per vedere i suoi viaggi',
  'countries.search': 'Cerca Paesi',
  'countries.searchPlaceholder': 'Cerca per nome o codice',
  'countries.clearSearch': 'Cancella la ricerca',
  'countries.filterByStatus': 'Filtra per stato di visita',
  'countries.filterByContinent': 'Filtra per continente',
  'countries.tab.all': 'Tutti',
  'countries.tab.visited': 'Visitati',
  'countries.tab.notVisited': 'Da visitare',
  'countries.allContinents': 'Tutti i continenti',
  'countries.empty': 'Nessun Paese corrisponde a questi filtri.',
  'countries.emptyHint': 'Prova un’altra ricerca o togli il filtro del continente.',

  // --- Dettagli di un Paese -----------------------------------------------
  'details.close': 'Chiudi i dettagli',
  'details.markVisited': 'Segna come visitato',
  'details.markNotVisited': 'Segna come non visitato',
  'details.trips': 'Viaggi',
  'details.addVisit': 'Aggiungi viaggio',
  'details.noTrips': 'Nessun viaggio registrato.',
  'details.noTripsHint': 'Aggiungine uno per ricordare quando ci sei stato.',

  // --- Form di aggiunta viaggio -------------------------------------------
  'visit.country': 'Paese',
  'visit.date': 'Data',
  'visit.city': 'Città',
  'visit.cityPlaceholder': 'Kyoto',
  'visit.note': 'Nota',
  'visit.notePlaceholder': 'Cosa vuoi ricordare?',
  'visit.photo': 'Foto',
  'visit.addPhoto': 'Aggiungi una foto',
  'visit.removePhoto': 'Rimuovi la foto',
  'visit.photoLimit': '(facoltativa, max {size})',
  'visit.photoNotFound': 'Foto non trovata',
  'visit.photoLoading': 'Caricamento della foto…',
  'visit.choose': 'Scegli una foto',
  'visit.save': 'Salva il viaggio',
  'visit.saving': 'Salvataggio…',
  'visit.remove': 'Elimina questo viaggio',
  'visit.photoAlt': 'Foto di questo viaggio',

  // --- Conferma rimozione -------------------------------------------------
  'remove.title': 'Togliere {country} dai visitati?',
  'remove.body#one':
    'Questo eliminerà anche l’unico viaggio registrato per questo Paese. Non si può annullare.',
  'remove.body#other':
    'Questo eliminerà anche i {count} viaggi registrati per questo Paese. Non si può annullare.',
  'remove.confirm#one': 'Togli ed elimina 1 viaggio',
  'remove.confirm#other': 'Togli ed elimina {count} viaggi',

  // --- Viaggi -------------------------------------------------------------
  'trips.title': 'Viaggi',
  'trips.subtitleEmpty': 'Tutti i posti dove sei stato, in ordine.',
  'trips.subtitle': '{trips} in {years}',
  'trips.inYear': 'Viaggi del {year}',
  'trips.empty.title': 'Ancora nessun viaggio',
  'trips.empty.body':
    'Apri un Paese dal globo o dalla lista Paesi, poi aggiungi una visita con la data, la città e una foto. Compariranno qui, dal più recente.',

  // --- Statistiche --------------------------------------------------------
  'statistics.title': 'Statistiche',
  'statistics.subtitleEmpty': 'I numeri compariranno qui appena segnerai il primo Paese.',
  'statistics.subtitle': '{visited} Paesi su {total} · {percentage}% del mondo',
  'statistics.totals': 'Totali',
  'statistics.tripsRecorded': 'Viaggi registrati',
  'statistics.acrossCountries': 'in {countries}',
  'statistics.ofThe195': 'Sui 195 Stati ONU',
  'statistics.everyCountryVisited': 'Tutti i Paesi visitati',
  'statistics.stillToGo': 'ne mancano {count}',
  'statistics.stillToVisit': 'Ancora da visitare',
  'statistics.left': 'ne restano {count}',
  'statistics.toGo': 'ne mancano {count}',
  'statistics.nothingLeft': 'Non manca più niente. Hai visitato tutti e 195 gli Stati ONU.',
  'statistics.tripsByYear': 'Viaggi per anno',
  'statistics.noTripsYet':
    'Nessun viaggio registrato. Aggiungine uno da un Paese per confrontare i tuoi anni.',
  'statistics.chartLabel': 'Viaggi per anno, dal {first} al {last}',
  'statistics.yearTrips': '{year}: {trips}',
  'statistics.empty.title': 'Ancora niente da misurare',
  'statistics.empty.body':
    'Segna un Paese come visitato, o aggiungi un viaggio con la sua data, e questa pagina si riempirà: copertura per continente, cosa resta da vedere e come si confrontano i tuoi anni.',

  // --- Achievement --------------------------------------------------------
  'achievements.title': 'Traguardi',
  'achievements.subtitle': '{unlocked} su {total} sbloccati',
  'achievements.basis': 'calcolati sui 195 Stati ONU',
  'achievements.nextUp': 'Il prossimo',
  'achievements.next': 'Prossimo traguardo',
  'achievements.unlocked': 'Sbloccati',
  'achievements.locked': 'Da sbloccare',
  'achievements.unlockedLabel': 'Sbloccato',
  'achievements.lockedLabel': 'Bloccato',
  'achievements.remaining': 'ne mancano {count} · {percentage}%',
  'achievements.allDone':
    'Tutti i traguardi sbloccati. Su questa pagina non resta più niente — solo sulla mappa.',
  'achievement.first-step.name': 'Primo passo',
  'achievement.first-step.description': 'Visita 1 Paese',
  'achievement.explorer.name': 'Esploratore',
  'achievement.explorer.description': 'Visita 10 Paesi',
  'achievement.travel-addict.name': 'Viaggiatore incallito',
  'achievement.travel-addict.description': 'Visita 25 Paesi',
  'achievement.world-traveler.name': 'Giramondo',
  'achievement.world-traveler.description': 'Visita 50 Paesi',
  'achievement.globe-trotter.name': 'Globetrotter',
  'achievement.globe-trotter.description': 'Visita 100 Paesi',
  'achievement.continent-master.name': 'Padrone di un continente',
  'achievement.continent-master.description': 'Visita tutti i Paesi di un continente',
  'achievement.world-explorer.name': 'Esploratore del mondo',
  'achievement.world-explorer.description': 'Visita tutti i Paesi del mondo',
  'achievement.detail.countries': '{current} Paesi su {target}',
  'achievement.detail.continentProgress': '{current} su {total} in {continent}',
  'achievement.detail.continentDone': '{continents}: completato',

  // --- Impostazioni -------------------------------------------------------
  'settings.title': 'Impostazioni',
  'settings.subtitle':
    'I tuoi dati non escono mai da questo dispositivo. Fai un backup da solo, o ricomincia da capo.',

  'settings.language.title': 'Lingua',
  'settings.language.description':
    'Cambia l’interfaccia e i nomi dei Paesi. I tuoi dati non vengono toccati.',

  'settings.install.title': 'Installa l’app',
  'settings.install.description':
    'La aggiunge alla schermata Home e la apre a schermo intero, senza la barra del browser. Funziona offline in ogni caso.',
  'settings.install.button': 'Installa',
  'settings.install.installed': 'Già installata — la stai usando proprio adesso.',
  'settings.install.unavailable':
    'Il browser non ha ancora proposto l’installazione. Ricarica la pagina dopo averla visitata una volta, oppure usa il menu del browser.',
  'settings.install.iosTitle': 'Su iPhone e iPad, Safari chiede di farlo a mano:',
  'settings.install.ios1': 'Tocca il pulsante Condividi in fondo a Safari.',
  'settings.install.ios2': 'Scorri in basso e scegli «Aggiungi a Home».',
  'settings.install.ios3': 'Tocca «Aggiungi» in alto a destra.',
  'settings.install.iosNote':
    'Funziona solo con Safari: Chrome e Firefox su iOS non possono installare le web app.',

  'settings.export.title': 'Esporta un backup',
  'settings.export.description':
    'Salva {countries} segnati a mano e {trips} in un file JSON che tieni tu.',
  'settings.export.noPhotos': 'Le foto non sono incluse.',
  'settings.export.noPhotosBody': 'Il file contiene solo Paesi, date, città e note.',
  'settings.export.photosStay#one':
    'La foto che hai allegato resta su questo dispositivo e andrà persa se cancelli i dati del browser.',
  'settings.export.photosStay#other':
    'Le {count} foto che hai allegato restano su questo dispositivo e andranno perse se cancelli i dati del browser.',
  'settings.export.button': 'Esporta il backup',
  'settings.export.nothing':
    'Non c’è ancora niente da esportare — segna un Paese o aggiungi un viaggio.',
  'settings.export.saved': 'Backup salvato. Controlla la cartella dei download.',

  'settings.import.title': 'Importa un backup',
  'settings.import.description': 'Ripristina un file JSON esportato da questa app.',
  'settings.import.replaces': 'L’import sostituisce tutto.',
  'settings.import.replacesBody':
    'I tuoi {countries} segnati e {trips} verranno scartati, non uniti. Esporta prima un backup se vuoi tenerli.',
  'settings.import.choose': 'Scegli un file di backup',
  'settings.import.reading': 'Lettura…',
  'settings.import.rejected': 'Questo file non è stato importato. I tuoi dati sono intatti.',
  'settings.import.done': 'Importati {countries} e {trips}.',
  'settings.import.confirmTitle': 'Sostituire tutti i tuoi dati?',
  'settings.import.confirmBody': '{file} contiene {countries} e {trips}.',
  'settings.import.confirmLoss':
    'Questo sostituisce i tuoi {countries} segnati e {trips}. Dopo non si potranno più recuperare.',
  'settings.import.confirmNoLoss': 'Al momento non hai niente salvato, quindi non perderai nulla.',
  'settings.import.confirmButton': 'Sostituisci i miei dati',

  'settings.reset.title': 'Azzera tutto',
  'settings.reset.description':
    'Cancella ogni Paese segnato, ogni viaggio e ogni foto da questo dispositivo. Non si può annullare.',
  'settings.reset.button': 'Azzera tutti i dati',
  'settings.reset.nothing': 'Non c’è niente salvato — non c’è niente da azzerare.',
  'settings.reset.done': 'È stato cancellato tutto. Sei tornato a zero Paesi.',
  'settings.reset.confirmTitle': 'Cancellare tutto?',
  'settings.reset.confirmBody':
    'Questo elimina {countries} segnati, {trips}{photos}. Non si può annullare.',
  'settings.reset.confirmPhotos': ' e {photos}',
  'settings.reset.confirmHint':
    'Se pensi di rivolerli, annulla ed esporta prima un backup.',
  'settings.reset.confirmButton': 'Cancella tutto',

  'settings.storage.title': 'Dove vivono i tuoi dati',
  'settings.storage.description':
    'Tutto è salvato in questo browser, su questo dispositivo. Nessun account, nessun server, nessuna sincronizzazione — il che vuol dire anche che nessun altro può recuperarli al posto tuo.',
  'settings.storage.ok':
    'L’archiviazione locale funziona. Cancellare i dati del browser, o disinstallare l’app, cancella tutto — un file di backup è l’unica copia che sopravvive.',
  'settings.storage.unavailable': 'L’archiviazione locale non è disponibile in questo browser.',

  // --- Aggiornamento ------------------------------------------------------
  'update.title': 'È pronta una nuova versione',
  'update.body': 'Ricarica per prenderla. I tuoi Paesi e i tuoi viaggi non vengono toccati.',
  'update.reload': 'Ricarica',
  'update.reloading': 'Ricaricamento…',
  'update.dismiss': 'Nascondi l’avviso di aggiornamento',

  // --- 404 ----------------------------------------------------------------
  'notFound.title': 'Questa pagina non esiste',
  'notFound.body': 'Quell’indirizzo non corrisponde a nessuna sezione dell’app.',
  'notFound.back': 'Torna al globo',

  // --- Messaggi dello store ------------------------------------------------
  'storage.unavailable':
    'L’archiviazione locale non è disponibile — succede in navigazione privata. Puoi comunque guardare e modificare, ma le modifiche andranno perse chiudendo la scheda.',
  'storage.readFailed':
    'Non è stato possibile leggere i dati salvati. Per questa sessione l’app parte vuota.',
  'storage.writeFailed': 'Non è stato possibile salvare la modifica. Riprova.',
  'storage.photoFailed': 'Non è stato possibile salvare la foto. Il viaggio non è stato aggiunto.',
  'storage.unknownCountry': 'Codice Paese sconosciuto: {code}.',
  'storage.invalidDate': 'Data del viaggio non valida: usa il formato AAAA-MM-GG.',
  'storage.importFailed': 'Import non riuscito: i dati precedenti sono stati mantenuti.',
  'storage.invalidFile': 'File non valido.',

  // --- Validazione dell'import ---------------------------------------------
  'validation.notJson':
    'Questo file non è JSON valido. Scegli un backup esportato da questa app.',
  'validation.notObject': 'Questo file non contiene un oggetto JSON valido.',
  'validation.futureFormat':
    'Questo file è stato creato da una versione più recente dell’app (formato {version}).',
  'validation.missingMarked': 'Manca il campo "manuallyMarked", oppure non è un elenco.',
  'validation.missingVisits': 'Manca il campo "visits", oppure non è un elenco.',
  'validation.readFailed': 'Non è stato possibile leggere quel file. Prova a sceglierlo di nuovo.',
  'validation.skippedCountries#one': '{count} Paese saltato: codice ISO sconosciuto.',
  'validation.skippedCountries#other': '{count} Paesi saltati: codice ISO sconosciuto.',
  'validation.skippedTrips#one': '{count} viaggio saltato: dati incompleti o non validi.',
  'validation.skippedTrips#other': '{count} viaggi saltati: dati incompleti o non validi.',

  // --- Validazione della foto ----------------------------------------------
  'photo.notImage': 'Quel file non è un’immagine. Scegli un JPEG, PNG, WebP, GIF o AVIF.',
  'photo.tooLarge': 'Quella foto pesa {size}, oltre il limite di {limit}. Scegline una più piccola.',
  'photo.unsupported': '{type} non è supportato. Usa JPEG, PNG, WebP, GIF o AVIF.',
  'photo.empty': 'Quel file è vuoto.',
}
