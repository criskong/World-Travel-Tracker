/**
 * Controlla il precache del service worker dopo la build.
 *
 * Esiste per un motivo preciso: Workbox salta i file oltre
 * `maximumFileSizeToCacheInBytes` SENZA DIRE NIENTE. Con il default da 2 MB
 * il GeoJSON (~3 MB) e il bundle di three.js (~1,9 MB) restano fuori, la
 * build resta verde e l'offline non funziona — e te ne accorgi solo mettendo
 * il telefono in aereo. Meglio farlo fallire qui.
 *
 *   node scripts/check-precache.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')

/**
 * Il percorso del dataset si legge da `dataset.ts`, che resta l'unica fonte
 * (CLAUDE.md, Dati geografici). Si estrae col regex invece di importare il
 * modulo: cosi lo script gira su qualunque Node, senza dipendere dal supporto
 * ai file TypeScript.
 */
const GEOJSON_PUBLIC_PATH = (() => {
  const source = readFileSync(resolve(process.cwd(), 'src/data/countries/dataset.ts'), 'utf8')
  const name = /GEOJSON_FILENAME\s*=\s*'([^']+)'/.exec(source)?.[1]
  if (!name) {
    console.error('  non riesco a leggere GEOJSON_FILENAME da src/data/countries/dataset.ts')
    process.exit(1)
  }
  return `data/${name}`
})()

/** File che non fanno parte del precache perche SONO il service worker. */
const NOT_PRECACHED = [/^sw\.js$/, /^workbox-[^/]+\.js$/, /\.map$/]

/** Estensioni che devono finire nel precache perche servono offline. */
const MUST_BE_CACHED = /\.(js|css|html|geojson|webmanifest|svg|png)$/

function walk(directory) {
  const out = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function fail(message) {
  console.error(`\n  precache NON valido: ${message}\n`)
  process.exit(1)
}

let serviceWorker
try {
  serviceWorker = readFileSync(join(DIST, 'sw.js'), 'utf8')
} catch {
  fail('dist/sw.js non esiste. Esegui prima `vite build`.')
}

const entries = [
  ...serviceWorker.matchAll(
    /\{\s*"?url"?:\s*"([^"]+)"\s*,\s*"?revision"?:\s*("[^"]*"|null)\s*\}/g,
  ),
].map((match) => ({ url: match[1], revision: match[2] }))

if (entries.length === 0) {
  fail('il manifest Workbox e vuoto o non e stato riconosciuto in dist/sw.js.')
}

// --- Stampa: l'elenco vero, non la promessa che ci sia ---------------------

const rows = entries
  .map(({ url }) => {
    const path = join(DIST, url.replace(/^\//, ''))
    let bytes = 0
    try {
      bytes = statSync(path).size
    } catch {
      bytes = -1
    }
    return { url, bytes }
  })
  .sort((a, b) => b.bytes - a.bytes)

const total = rows.reduce((sum, row) => sum + Math.max(0, row.bytes), 0)

console.log(`\nPRECACHE — ${rows.length} voci, ${(total / 1024 / 1024).toFixed(2)} MB\n`)
for (const row of rows) {
  const size = row.bytes < 0 ? '   MANCA' : `${(row.bytes / 1024).toFixed(1)} KB`
  console.log(`  ${size.padStart(10)}  ${row.url}`)
}
console.log('')

// --- Controlli -------------------------------------------------------------

const problems = []

const missingOnDisk = rows.filter((row) => row.bytes < 0)
if (missingOnDisk.length > 0) {
  problems.push(`precache di file che non esistono: ${missingOnDisk.map((r) => r.url).join(', ')}`)
}

const seen = new Map()
for (const entry of entries) {
  const previous = seen.get(entry.url)
  if (previous !== undefined && previous !== entry.revision) {
    // Workbox lancia add-to-cache-list-conflicting-entries e il service
    // worker non si installa affatto.
    problems.push(`URL duplicato con revision diverse: ${entry.url}`)
  }
  seen.set(entry.url, entry.revision)
}
if (seen.size !== entries.length) {
  console.log(`  nota: ${entries.length - seen.size} voci duplicate (revision identiche)\n`)
}

const cached = new Set(entries.map((entry) => entry.url.replace(/^\//, '')))
const onDisk = walk(DIST)
  .map((path) => relative(DIST, path).split('\\').join('/'))
  .filter((path) => MUST_BE_CACHED.test(path) && !NOT_PRECACHED.some((rule) => rule.test(path)))

const notCached = onDisk.filter((path) => !cached.has(path))
if (notCached.length > 0) {
  problems.push(
    `questi file della build NON sono nel precache:\n    ${notCached.join('\n    ')}\n` +
      '    (se sono grossi, e maximumFileSizeToCacheInBytes)',
  )
}

if (!cached.has(GEOJSON_PUBLIC_PATH)) {
  problems.push(`il dataset ${GEOJSON_PUBLIC_PATH} non e nel precache: l'app non funziona offline`)
}

if (problems.length > 0) {
  fail(problems.join('\n  '))
}

console.log(`  ok: ${onDisk.length} file della build sono tutti nel precache, ${GEOJSON_PUBLIC_PATH} compreso\n`)
