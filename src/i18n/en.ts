/**
 * Dizionario inglese — e la fonte delle chiavi.
 *
 * `it.ts` e tipizzato come `Record<keyof typeof en, string>`, quindi ogni
 * chiave aggiunta qui va tradotta li o il progetto non compila. Le chiavi che
 * finiscono con `#` sono plurali e hanno le varianti `#one` e `#other`.
 */
export const en = {
  // --- Comune -------------------------------------------------------------
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.tryAgain': 'Try again',
  'common.delete': 'Delete',
  'common.optional': '(optional)',
  'common.visited': 'Visited',
  'common.notVisited': 'Not visited',
  'common.territory': 'Territory',
  'common.territoryHint': 'Not a UN member state — not counted in the 195',
  'common.trip#one': '{count} trip',
  'common.trip#other': '{count} trips',
  'common.country#one': '{count} country',
  'common.country#other': '{count} countries',
  'common.year#one': '{count} year',
  'common.year#other': '{count} years',
  'common.photo#one': '{count} photo',
  'common.photo#other': '{count} photos',

  // --- Continenti ---------------------------------------------------------
  'continent.Africa': 'Africa',
  'continent.Asia': 'Asia',
  'continent.Europe': 'Europe',
  'continent.North America': 'North America',
  'continent.South America': 'South America',
  'continent.Oceania': 'Oceania',
  'continent.Antarctica': 'Antarctica',

  // --- Navigazione --------------------------------------------------------
  'nav.home': 'Home',
  'nav.home.description': 'Globe and summary',
  'nav.countries': 'Countries',
  'nav.countries.description': 'Every country',
  'nav.trips': 'Trips',
  'nav.trips.description': 'Your trips',
  'nav.statistics': 'Statistics',
  'nav.statistics.description': 'Numbers and charts',
  'nav.achievements': 'Achievements',
  'nav.achievements.description': 'Milestones unlocked',
  'nav.settings': 'Settings',
  'nav.settings.description': 'Data and preferences',
  'nav.sections': 'Sections',
  'nav.footer': 'All your data stays on this device.',
  'nav.primary': 'Main navigation',

  // --- Home ---------------------------------------------------------------
  'home.title': 'World Travel Tracker',
  'home.tagline': "See where you've been. Discover where you'll go next.",
  'home.globe': 'Interactive globe',
  'home.globe.loading': 'Loading the globe…',
  'home.globe.failed': 'The globe could not be displayed',
  'home.globe.failedHint':
    'Your browser may not support 3D graphics, or they may be turned off. Everything else still works: use the Countries page to mark where you have been.',
  'home.globe.mapFailed': 'Could not load the country map. Reload the page to try again.',

  // --- Statistiche della Home ---------------------------------------------
  'stats.section': 'Statistics',
  'stats.countriesVisited': 'Countries visited',
  'stats.ofTheWorld': 'Of the world',
  'stats.territories': 'Territories',
  'stats.beyondThe195': 'beyond the 195',
  'stats.byContinent': 'By continent',
  'stats.empty.title': 'Your world is still waiting',
  'stats.empty.body':
    'Spin the globe and tap a country to open its details. Mark it as visited from there, and your numbers will show up here.',
  'stats.empty.footer': '0 / 195 countries · 0% of the world',
  'stats.continentBar': '{continent}: {visited} of {total} countries, {percentage}%',

  // --- Viaggi recenti -----------------------------------------------------
  'recent.title': 'Recent trips',
  'recent.all': 'All trips',
  'recent.empty': "No trips recorded yet. Add one from a country's details to see it here.",

  // --- Paesi --------------------------------------------------------------
  'countries.title': 'Countries',
  'countries.subtitle': '{visited} of {total} tracked · tap a country to see its trips',
  'countries.search': 'Search countries',
  'countries.searchPlaceholder': 'Search by name or code',
  'countries.clearSearch': 'Clear search',
  'countries.filterByStatus': 'Filter by visit status',
  'countries.filterByContinent': 'Filter by continent',
  'countries.tab.all': 'All',
  'countries.tab.visited': 'Visited',
  'countries.tab.notVisited': 'Not visited',
  'countries.allContinents': 'All continents',
  'countries.empty': 'No countries match these filters.',
  'countries.emptyHint': 'Try a different search or clear the continent.',

  // --- Dettagli di un Paese -----------------------------------------------
  'details.close': 'Close details',
  'details.markVisited': 'Mark as visited',
  'details.markNotVisited': 'Mark as not visited',
  'details.trips': 'Trips',
  'details.addVisit': 'Add visit',
  'details.noTrips': 'No trips recorded yet.',
  'details.noTripsHint': 'Add one to remember when you were here.',

  // --- Form di aggiunta viaggio -------------------------------------------
  'visit.country': 'Country',
  'visit.date': 'Date',
  'visit.city': 'City',
  'visit.cityPlaceholder': 'Kyoto',
  'visit.note': 'Note',
  'visit.notePlaceholder': 'What do you want to remember?',
  'visit.photo': 'Photo',
  'visit.addPhoto': 'Add a photo',
  'visit.removePhoto': 'Remove photo',
  'visit.photoLimit': '(optional, up to {max}, max {size} each)',
  'visit.photoNotFound': 'Photo not found',
  'visit.photosMissing#one': '1 photo is missing from this device',
  'visit.photosMissing#other': '{count} photos are missing from this device',
  'visit.photoLoading': 'Loading photo…',
  'visit.choose': 'Choose photos',
  'visit.chooseMore': 'Add more photos',
  'visit.removePhotoAt': 'Remove photo {position}',
  'visit.save': 'Save trip',
  'visit.saving': 'Saving…',
  'visit.remove': 'Delete this trip',
  'visit.photoAlt': 'Photo from this trip',

  // --- Conferma rimozione -------------------------------------------------
  'remove.title': 'Remove {country} from visited?',
  'remove.body#one':
    'This will also delete the 1 trip recorded for this country. This cannot be undone.',
  'remove.body#other':
    'This will also delete the {count} trips recorded for this country. This cannot be undone.',
  'remove.confirm#one': 'Remove and delete 1 trip',
  'remove.confirm#other': 'Remove and delete {count} trips',

  // --- Viaggi -------------------------------------------------------------
  'trips.title': 'Trips',
  'trips.subtitleEmpty': "Everywhere you've been, in order.",
  'trips.subtitle': '{trips} across {years}',
  'trips.inYear': 'Trips in {year}',
  'trips.empty.title': 'No trips yet',
  'trips.empty.body':
    'Open a country from the globe or from the Countries list, then add a visit with the date, the city and a photo. They will show up here, newest first.',

  // --- Statistiche --------------------------------------------------------
  'statistics.title': 'Statistics',
  'statistics.subtitleEmpty': 'Numbers will appear here as soon as you mark your first country.',
  'statistics.subtitle': '{visited} of {total} countries · {percentage}% of the world',
  'statistics.totals': 'Totals',
  'statistics.tripsRecorded': 'Trips recorded',
  'statistics.acrossCountries': 'across {countries}',
  'statistics.ofThe195': 'Of the 195 UN states',
  'statistics.everyCountryVisited': 'Every country visited',
  'statistics.stillToGo': '{count} still to go',
  'statistics.stillToVisit': 'Still to visit',
  'statistics.left': '{count} left',
  'statistics.toGo': '{count} to go',
  'statistics.nothingLeft': 'Nothing left. You have visited every one of the 195 UN states.',
  'statistics.tripsByYear': 'Trips by year',
  'statistics.noTripsYet':
    'No trips recorded yet. Add one from a country to see how your years compare.',
  'statistics.chartLabel': 'Trips per year, from {first} to {last}',
  'statistics.yearTrips': '{year}: {trips}',
  'statistics.empty.title': 'Nothing to measure yet',
  'statistics.empty.body':
    'Mark a country as visited, or add a trip with its date, and this page will fill up: coverage by continent, what is left to see, and how your years compare.',

  // --- Achievement --------------------------------------------------------
  'achievements.title': 'Achievements',
  'achievements.subtitle': '{unlocked} of {total} unlocked',
  'achievements.basis': 'based on the 195 UN states',
  'achievements.nextUp': 'Next up',
  'achievements.next': 'Next achievement',
  'achievements.unlocked': 'Unlocked',
  'achievements.locked': 'Locked',
  'achievements.unlockedLabel': 'Unlocked',
  'achievements.lockedLabel': 'Locked',
  'achievements.remaining': '{count} to go · {percentage}%',
  'achievements.allDone':
    'Every achievement unlocked. There is nothing left on this page — only on the map.',
  'achievement.first-step.name': 'First Step',
  'achievement.first-step.description': 'Visit 1 country',
  'achievement.explorer.name': 'Explorer',
  'achievement.explorer.description': 'Visit 10 countries',
  'achievement.travel-addict.name': 'Travel Addict',
  'achievement.travel-addict.description': 'Visit 25 countries',
  'achievement.world-traveler.name': 'World Traveler',
  'achievement.world-traveler.description': 'Visit 50 countries',
  'achievement.globe-trotter.name': 'Globe Trotter',
  'achievement.globe-trotter.description': 'Visit 100 countries',
  'achievement.continent-master.name': 'Continent Master',
  'achievement.continent-master.description': 'Visit every country of a single continent',
  'achievement.world-explorer.name': 'World Explorer',
  'achievement.world-explorer.description': 'Visit every country in the world',
  'achievement.detail.countries': '{current} of {target} countries',
  'achievement.detail.continentProgress': '{current} of {total} in {continent}',
  'achievement.detail.continentDone': '{continents} completed',

  // --- Impostazioni -------------------------------------------------------
  'settings.title': 'Settings',
  'settings.subtitle': 'Your data never leaves this device. Back it up yourself, or start over.',

  'settings.language.title': 'Language',
  'settings.language.description':
    'Changes the interface and the country names. Your data is not affected.',

  'settings.install.title': 'Install the app',
  'settings.install.description':
    'Adds it to your home screen and opens it full screen, without the browser bar. It works offline either way.',
  'settings.install.button': 'Install',
  'settings.install.installed': 'Already installed — you are using the app right now.',
  'settings.install.unavailable':
    'Your browser has not offered installation here. On Chrome and Edge you can install from the ⋮ menu — "Install World Travel Tracker" — or from the icon at the right end of the address bar.',
  'settings.install.iosTitle': 'On iPhone and iPad, Safari asks you to do it by hand:',
  'settings.install.ios1': 'Tap the Share button at the bottom of Safari.',
  'settings.install.ios2': 'Scroll down and choose "Add to Home Screen".',
  'settings.install.ios3': 'Tap "Add" at the top right.',
  'settings.install.iosNote':
    'It only works in Safari: Chrome and Firefox on iOS cannot install web apps.',

  'settings.export.title': 'Export a backup',
  'settings.export.description':
    'Saves {countries} manually marked and {trips} to a JSON file you keep yourself.',
  'settings.export.withPhotos': 'Photos are included.',
  'settings.export.photosIncluded#one':
    'The file is a .zip with your 1 photo inside, next to countries, dates, cities and notes.',
  'settings.export.photosIncluded#other':
    'The file is a .zip with your {count} photos inside, next to countries, dates, cities and notes.',
  'settings.export.noPhotosYet':
    'The file is a .zip: countries, dates, cities and notes now, and your photos as soon as you add some.',
  'settings.export.preparing': 'Preparing…',
  'settings.export.button': 'Export backup',
  'settings.export.nothing': 'Nothing to export yet — mark a country or add a trip first.',
  'settings.export.saved': 'Backup saved. Check your downloads folder.',

  'settings.import.title': 'Import a backup',
  'settings.import.description': 'Restores a JSON file exported from this app.',
  'settings.import.replaces': 'Importing replaces everything.',
  'settings.import.replacesBody':
    'Your current {countries} marked and {trips} will be discarded, not merged. Export a backup first if you want to keep them.',
  'settings.import.choose': 'Choose a backup file',
  'settings.import.reading': 'Reading…',
  'settings.import.rejected': 'This file was not imported. Your data is unchanged.',
  'settings.import.done': 'Imported {countries} and {trips}.',
  'settings.import.photosRestored#one': '1 photo restored.',
  'settings.import.photosRestored#other': '{count} photos restored.',
  'settings.import.photosFound#one': 'It also contains 1 photo.',
  'settings.import.photosFound#other': 'It also contains {count} photos.',
  'settings.import.confirmTitle': 'Replace all your data?',
  'settings.import.confirmBody': '{file} contains {countries} and {trips}.',
  'settings.import.confirmLoss':
    'This replaces your current {countries} marked and {trips}. They cannot be recovered afterwards.',
  'settings.import.confirmNoLoss': 'You have nothing saved right now, so nothing will be lost.',
  'settings.import.confirmButton': 'Replace my data',

  'settings.reset.title': 'Reset everything',
  'settings.reset.description':
    'Erases every marked country, every trip and every photo from this device. There is no undo.',
  'settings.reset.button': 'Reset all data',
  'settings.reset.nothing': 'Nothing stored — there is nothing to reset.',
  'settings.reset.done': 'Everything was erased. You are back to zero countries.',
  'settings.reset.confirmTitle': 'Erase everything?',
  'settings.reset.confirmBody': 'This deletes {countries} marked, {trips}{photos}. It cannot be undone.',
  'settings.reset.confirmPhotos': ' and {photos}',
  'settings.reset.confirmHint': 'If you might want this back, cancel and export a backup first.',
  'settings.reset.confirmButton': 'Erase everything',

  'settings.storage.title': 'Where your data lives',
  'settings.storage.description':
    'Everything is stored in this browser, on this device. No account, no server, no sync — which also means nobody else can restore it for you.',
  'settings.storage.ok':
    'Local storage is working. Clearing your browser data, or uninstalling the app, deletes everything — a backup file is the only copy that survives.',
  'settings.storage.unavailable': 'Local storage is unavailable in this browser.',

  // --- Aggiornamento ------------------------------------------------------
  'update.title': 'A new version is ready',
  'update.body': 'Reload to get it. Your countries and trips are not affected.',
  'update.reload': 'Reload',
  'update.reloading': 'Reloading…',
  'update.dismiss': 'Dismiss update notice',

  // --- 404 ----------------------------------------------------------------
  'notFound.title': 'This page does not exist',
  'notFound.body': "That address doesn't match any section of the app.",
  'notFound.back': 'Back to the globe',

  // --- Messaggi dello store ------------------------------------------------
  'storage.unavailable':
    'Local storage is unavailable — this happens in private browsing. You can still browse and edit, but changes will be lost when you close this tab.',
  'storage.readFailed': 'Could not read your saved data. The app starts empty for this session.',
  'storage.writeFailed': 'Could not save your change. Please try again.',
  'storage.photoFailed': 'Could not save the photo. The trip was not added.',
  'storage.unknownCountry': 'Unknown country code: {code}.',
  'storage.invalidDate': 'Invalid trip date: use the YYYY-MM-DD format.',
  'storage.importFailed': 'Import failed: your previous data was kept.',
  'storage.invalidFile': 'Invalid file.',

  // --- Validazione dell'import ---------------------------------------------
  'validation.notJson': 'This file is not valid JSON. Pick a backup exported from this app.',
  'validation.notObject': 'This file does not contain a valid JSON object.',
  'validation.futureFormat': 'This file was created by a newer version of the app (format {version}).',
  'validation.missingMarked': 'Missing "manuallyMarked" field, or it is not a list.',
  'validation.missingVisits': 'Missing "visits" field, or it is not a list.',
  'validation.readFailed': 'Could not read that file. Try picking it again.',
  'validation.badArchive':
    'This file could not be opened. Pick the .zip backup exported from this app, without unzipping it.',
  'validation.skippedCountries#one': '{count} country was skipped: unknown ISO code.',
  'validation.skippedCountries#other': '{count} countries were skipped: unknown ISO code.',
  'validation.skippedTrips#one': '{count} trip was skipped: incomplete or invalid data.',
  'validation.skippedTrips#other': '{count} trips were skipped: incomplete or invalid data.',

  // --- Validazione della foto ----------------------------------------------
  'photo.notImage': 'That file is not an image. Pick a JPEG, PNG, WebP, GIF or AVIF.',
  'photo.tooLarge': 'That photo is {size}, over the {limit} limit. Pick a smaller one.',
  'photo.unsupported': '{type} is not supported. Use JPEG, PNG, WebP, GIF or AVIF.',
  'photo.tooMany': 'A trip can have at most {max} photos.',
  'photo.empty': 'That file is empty.',
} as const
