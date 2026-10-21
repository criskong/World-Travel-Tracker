# World Travel Tracker

[![CI](https://github.com/criskong/World-Travel-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/criskong/World-Travel-Tracker/actions/workflows/ci.yml)

**English** · [Italiano](README.it.md)

**See where you've been. Discover where you'll go next.**

**Live:** [world-travel-tracker-two.vercel.app](https://world-travel-tracker-two.vercel.app/)

A personal app to track the countries you've visited on an interactive 3D
globe. No account, no server, no network calls at runtime: everything lives
in the browser, on the user's device. Installable as a PWA and fully usable
offline after the first load.

---

## Highlights

- **From 1.6 s to 0.3 s on the globe's critical path.** Building the 3D meshes
  was a single synchronous block that froze phones. Profiled, fixed with
  runtime geometry simplification and progressive loading — the globe stays
  draggable while countries appear. [Details](#runtime-geometry-simplification)
- **All 195 countries, micro-states included.** The lighter map dataset has no
  geometry for 29 UN members (Malta, Singapore, Monaco, …). Switching datasets
  fixed coverage and created the performance problem above.
- **Offline-first PWA** with a build step that *fails* if anything is missing
  from the service-worker precache — because offline always breaks silently.
- **iPhone photos (HEIC) resized in the browser** before saving: 2.4 MB →
  480 KB, no server involved.
- **Hand-written ZIP backup**, no dependencies: data and photos in one file
  that any archive tool can open.
- **Bilingual (EN/IT) without an i18n library**: a missing translation is a
  compile error, not English text in an Italian page.
- **590+ tests**, run on every push by [GitHub Actions](.github/workflows/ci.yml).

---

## Features

- **Interactive 3D globe** — 242 clickable countries and territories, rotate
  and zoom, hover highlight. Sand-coloured land on a blue ocean; visited
  countries turn emerald green and rise in relief. The globe spins slowly
  until the first touch, under an SVG starry sky. Tapping a country opens its
  details.
- **Countries** — full list, search by name or ISO code, filter by visit
  status and continent.
- **Trips** — multiple trips per country, each with date, city, note and up to
  ten photos. Timeline grouped by year; trips can be edited after saving.
- **Statistics** — coverage per continent, what's left to see, trips per year.
- **Achievements** — seven milestones that unlock on their own, from the first
  country to the whole world.
- **Settings** — language, install as app, ZIP backup export/import (photos
  included), full reset, and a diagnostic of what is actually stored on disk.

---

## Stack

| | |
|---|---|
| UI | React 18.3 (**not** 19: react-globe.gl requires React 18 as a peer) |
| Language | TypeScript 5.9, `strict` |
| Build | Vite 8 |
| Styling | Tailwind CSS v3 |
| Globe | react-globe.gl → globe.gl → three-globe → three 0.185 |
| State | Zustand 5 |
| Persistence | Dexie 4 on IndexedDB |
| Routing | react-router-dom 7 |
| PWA | vite-plugin-pwa (Workbox) |
| i18n | no library: typed dictionaries + `Intl` |
| Tests | Vitest 4 + Testing Library + fake-indexeddb |

---

## Getting started

```bash
npm install
npm run dev              # dev server
npm run dev -- --host    # reachable from a phone on the same network
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, production build **and precache check** |
| `npm run preview` | Serve the production build |
| `npm test` | Full Vitest suite |
| `npm run typecheck` | `tsc --noEmit` only |

Deployed as a static site on Vercel: preset Vite, output `dist`, no
environment variables. `vercel.json` adds the SPA rewrite to `index.html` and
`Cache-Control: immutable` on the dataset.

---

## Architecture

```
src/
  components/         UI, one folder per area (Globe, CountryDetails, …)
  pages/              one per route, code-split (the globe is lazy-loaded too)
  store/              Zustand store + derived selectors
  services/storage/   the only code allowed to talk to IndexedDB
  data/countries/     country list, ISO resolver, geometry simplification
  i18n/               dictionaries and localized country names
  utils/              pure logic: stats, achievements, backup, zip
```

Layers are kept separate: UI / state / storage / geo data / utilities.
A test fails if anything outside `services/storage/` imports the database.

**One source of truth.** Only two things are persisted: the countries marked
by hand and the trips. "Visited" is a derived selector
(`manuallyMarked.includes(code) || visits.some(v => v.countryCode === code)`),
and achievements are recomputed on every render. Nothing derived is ever
stored, so nothing can drift out of sync — and importing a backup restores
the medals for free.

**The globe is never rebuilt.** Home stays mounted while the user navigates
elsewhere and is only hidden; remounting it meant rebuilding 610 meshes and a
WebGL context every time. A zero-size container doubles as the "not visible"
signal that pauses the render loop. A test counts mounts and fails if the
globe remounts.

---

## Key decisions

The full reasoning, including the options that were tried and rejected, is in
[`CLAUDE.md`](CLAUDE.md) (in Italian).

### Natural Earth 50m dataset

In the 110m dataset **29 UN member states have no geometry** — they simply
don't exist on the globe. The 50m dataset brings coverage from 166/195 to
**195/195**, at the cost of 2.9 MB instead of 0.8.

### Runtime geometry simplification

With the 50m data, building the meshes took **~1,600 ms in one synchronous
block**. Profiling showed the cost wasn't parsing (22 ms) or the number of
polygons: three-globe triangulates each ring at a cost that grows with the
**square of its vertices**. Antarctica's main ring alone, 2,805 vertices,
took ~890 ms — more than half of the world.

Two independent fixes:

1. **Douglas-Peucker at runtime**, tolerance 0.02° (~2.2 km, below one pixel
   at the default zoom), with an 800-vertex cap per ring. 99,613 → 40,139
   vertices; mesh build **1,613 → 334 ms**. The largest polygon of each
   country is never dropped, and a test checks that all 195 states keep
   their geometry.
2. **Progressive reveal**: countries reach the globe one group per frame,
   largest first. The same total work becomes short slices with a paint in
   between, so the globe keeps responding while it fills in.

Simplifying at runtime instead of committing a pre-simplified file keeps a
single dataset in the repo, and the simplification is code with tests.

### Offline that can't break silently

Workbox skips files over 2 MB without warning — the dataset alone is 3 MB.
The limit is raised to 5 MB, and `scripts/check-precache.mjs` runs inside
`npm run build`: it fails if a built file is missing from the precache, if an
entry points to a non-existent file, or if a URL appears twice.

Service-worker updates use `prompt`, not auto-reload: reloading while
someone is typing a trip note would throw it away.

### Storage you can't see is storage you can lose

All data stays in IndexedDB. `navigator.storage.persist()` is requested at
startup, because iOS Safari can evict site data after ~7 days of inactivity.
If IndexedDB is unavailable (Safari private browsing) the app still runs in
memory with a clear warning. Settings reads the row counts **from disk**, not
from the store, and warns if they differ — the only way a failed write
becomes visible.

### Backup: ZIP, replace, validate first

The backup is a ZIP (`backup.json` + `photos/<id>.jpg` + a readme), written
by hand in `src/utils/zip.ts` with the "stored" method: photos are already
JPEG, compressing them again isn't worth it. Verified against Python's
`zipfile` — valid CRCs, identical bytes.

- **Validation comes before any write**: a pure parser decides first, so an
  invalid file leaves data untouched because it was never touched — not
  because of a rollback.
- **Import replaces, it doesn't merge**: a backup is a snapshot, and merging
  would resurrect entries the user had deleted.
- Older `.json` backups still import; the format is detected from the bytes,
  not the file extension.

### Photos resized in the browser

iPhones shoot HEIC, and their photos often exceed 5 MB even as JPEG. Instead
of widening a format whitelist, every photo is **decoded by the browser**,
scaled to 2048 px on the long side and re-encoded as JPEG at 0.85. Stored as
`Blob`, never base64.

### Bilingual without a library

`en.ts` defines the keys; `it.ts` is typed as `Record<keyof typeof en,
string>`, so a forgotten translation doesn't compile. The store and the
validators never produce sentences, only keys plus parameters: switching
language also re-translates messages already in state. Italian country names
come from `Intl.DisplayNames` — all 250 codes, available offline.

### 195 is the denominator

Every percentage is computed from the UN member list (193 members + Holy See
and Palestine), never by counting GeoJSON features — there are 242, including
territories, and one code is shared by several features. Visited territories
are counted separately and don't advance achievements, so "50 / 195" and
"World Traveler at 50" never disagree on the same screen.

---

## Testing

- `tsc` in strict mode and the production build must pass clean; CI runs
  both plus the tests on every push.
- 590+ Vitest tests on pure logic and components: statistics, achievements,
  import validation, ISO resolution, geometry simplification, caching, modal
  accessibility, colour-contrast ratios.
- WebGL doesn't exist in jsdom, so globe tests use a test double. To cover
  the contract with the real library, `globeAccessors.test.tsx` mounts the
  real `GlobeView`, captures every prop passed to `<Globe>` and checks that
  each accessor returns the right type for all 242 polygons. It fails on any
  prop it doesn't know, so a new accessor can't go unchecked.
- Interactions with the globe are tested by hand, on real phones.

---

## About

Personal project, built with [Claude Code](https://claude.com/claude-code)
as an AI pair programmer: I drove the product and architecture decisions,
the AI helped implement, measure and test them. The decision log in
`CLAUDE.md` is the shared spec we worked from.

Geographic data: [Natural Earth](https://www.naturalearthdata.com/), public
domain.
