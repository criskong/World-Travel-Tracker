import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GEOJSON_PUBLIC_PATH } from './data/countries/dataset'

/**
 * Requisiti di funzionamento offline, verificati sul codice sorgente.
 *
 * "Funziona offline" non e una cosa che si possa dimostrare con dei test
 * unitari: serve un browser vero con la rete staccata, e quella parte resta
 * da collaudare a mano. Quello che invece si puo verificare qui, e che se
 * cambiasse nessuno se ne accorgerebbe finche non e troppo tardi, e il
 * vincolo da cui l'offline dipende: NESSUNA chiamata di rete a runtime,
 * nessuna risorsa presa da un CDN (CLAUDE.md, Vincoli non negoziabili).
 *
 * Basta un font di Google, un'icona da unpkg o un'immagine remota per
 * trasformare l'app in qualcosa che offline si apre a meta.
 */

const ROOT = resolve(process.cwd())
const SOURCE = join(ROOT, 'src')

function sourceFiles(directory: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** I file dell'app: i test possono usare quello che vogliono. */
const APP_FILES = sourceFiles(SOURCE).filter((path) => !/\.test\.tsx?$/.test(path))

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function relativeTo(path: string): string {
  return relative(ROOT, path).split('\\').join('/')
}

describe('nessuna risorsa remota', () => {
  /**
   * Gli URL assoluti ammessi sono quelli che non vengono MAI richiesti dal
   * browser: link di documentazione nei commenti e namespace XML.
   */
  const ALLOWED = [
    /https:\/\/vite\.dev/,
    /https:\/\/vite-pwa-org\.netlify\.app/,
    /https:\/\/www\.w3\.org\/2000\/svg/,
    /https:\/\/openapi\.vercel\.sh/,
  ]

  it.each(APP_FILES.map((path) => [relativeTo(path), path]))(
    '%s non punta a un host esterno',
    (_name, path) => {
      const source = read(path)
      const urls = [...source.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((match) => match[0])
      const external = urls.filter((url) => !ALLOWED.some((rule) => rule.test(url)))
      expect(external).toEqual([])
    },
  )

  it('il CSS non importa font o fogli di stile remoti', () => {
    for (const path of APP_FILES.filter((file) => file.endsWith('.css'))) {
      const source = read(path)
      expect(source).not.toMatch(/@import\s+url\(\s*['"]?https?:/i)
      expect(source).not.toMatch(/src:\s*url\(\s*['"]?https?:/i)
    }
  })

  it('index.html non carica niente da fuori', () => {
    const html = read(join(ROOT, 'index.html'))
    const remote = [...html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
    expect(remote).toEqual([])
  })
})

describe('le chiamate di rete', () => {
  it('esiste una sola fetch in tutta l app, ed e il dataset', () => {
    const callers = APP_FILES.filter((path) => /\bfetch\s*\(/.test(read(path))).map(relativeTo)
    expect(callers).toEqual(['src/data/countries/geoData.ts'])
  })

  it('quella fetch chiede un percorso relativo, servito dalla stessa origine', () => {
    const source = read(join(SOURCE, 'data/countries/geoData.ts'))
    expect(source).toContain('GEOJSON_PUBLIC_PATH')
    expect(source).toMatch(/fetch\(GEOJSON_URL\)/)
    // BASE_URL e relativo: nessun host scritto a mano.
    expect(source).toMatch(/import\.meta\.env\.BASE_URL/)
  })

  it('non si usano XMLHttpRequest, WebSocket, EventSource o sendBeacon', () => {
    for (const path of APP_FILES) {
      const source = read(path)
      for (const forbidden of ['XMLHttpRequest', 'new WebSocket', 'EventSource', 'sendBeacon']) {
        expect(source, `${relativeTo(path)} usa ${forbidden}`).not.toContain(forbidden)
      }
    }
  })
})

describe('quello che deve stare nel precache', () => {
  it('il dataset e un file locale sotto public/', () => {
    expect(GEOJSON_PUBLIC_PATH.startsWith('data/')).toBe(true)
    expect(() => readFileSync(join(ROOT, 'public', GEOJSON_PUBLIC_PATH))).not.toThrow()
  })

  it('la configurazione alza il limite di Workbox oltre i 3 MB del dataset', () => {
    const config = read(join(ROOT, 'vite.config.ts'))
    expect(config).toMatch(/maximumFileSizeToCacheInBytes/)
    // Il default di Workbox e 2 MB e il dataset da solo lo supera.
    const bytes = readFileSync(join(ROOT, 'public', GEOJSON_PUBLIC_PATH)).length
    expect(bytes).toBeGreaterThan(2 * 1024 * 1024)
    expect(config).toMatch(/5 \* 1024 \* 1024/)
  })

  it('il routing profondo ha un fallback offline', () => {
    // Senza navigateFallback, aprire /statistics senza rete da una pagina di
    // errore del browser invece dell'app.
    expect(read(join(ROOT, 'vite.config.ts'))).toMatch(/navigateFallback:\s*'index\.html'/)
  })

  it('vercel.json riscrive tutto su index.html per lo stesso motivo, ma online', () => {
    const vercel = JSON.parse(read(join(ROOT, 'vercel.json'))) as {
      rewrites: { source: string; destination: string }[]
    }
    expect(vercel.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
