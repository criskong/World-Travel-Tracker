/**
 * Genera le icone PNG della PWA.
 *
 * Niente dipendenze: le icone vengono rasterizzate a mano e scritte come PNG
 * con `zlib`, che sta nella libreria standard di Node. Un pacchetto in più
 * solo per disegnare quattro cerchi non valeva il peso, e uno script
 * committato si rigenera quando serve — a differenza di quattro PNG binari
 * che nessuno saprebbe più da dove vengono.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const PALETTE = {
  backdrop: [10, 14, 23, 255], // base-800
  sphere: [11, 18, 32, 255], // COLOR_GLOBE
  accent: [56, 189, 248, 255], // accent
  grid: [56, 189, 248, 110], // accent, attenuato per meridiani e paralleli
}

/** Supersampling: si disegna a 4x e si media, così i bordi non sono a scaletta. */
const SCALE = 4

function blend(target, offset, [r, g, b, a]) {
  const alpha = a / 255
  target[offset] = Math.round(target[offset] * (1 - alpha) + r * alpha)
  target[offset + 1] = Math.round(target[offset + 1] * (1 - alpha) + g * alpha)
  target[offset + 2] = Math.round(target[offset + 2] * (1 - alpha) + b * alpha)
  target[offset + 3] = Math.max(target[offset + 3], a)
}

/**
 * Disegna l'icona su una griglia `size`x`size` supersamplata.
 *
 * `padding` è la frazione di lato lasciata libera attorno al globo. Le icone
 * maskable ne vogliono molta: il sistema operativo può ritagliarle a cerchio,
 * e tutto ciò che sta fuori dal 80% centrale può sparire.
 */
function drawIcon(size, { padding, rounded }) {
  const dimension = size * SCALE
  const pixels = new Uint8ClampedArray(dimension * dimension * 4)

  const radius = (dimension / 2) * (1 - padding)
  const center = dimension / 2
  const cornerRadius = rounded ? dimension * 0.22 : 0
  const stroke = Math.max(1, dimension * 0.022)

  /** Distanza dal bordo di un rettangolo con angoli arrotondati. */
  const insideBackdrop = (x, y) => {
    if (cornerRadius === 0) return true
    const dx = Math.abs(x - center) - (dimension / 2 - cornerRadius)
    const dy = Math.abs(y - center) - (dimension / 2 - cornerRadius)
    if (dx <= 0 || dy <= 0) return true
    return Math.hypot(dx, dy) <= cornerRadius
  }

  for (let y = 0; y < dimension; y += 1) {
    for (let x = 0; x < dimension; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const offset = (y * dimension + x) * 4

      if (!insideBackdrop(px, py)) continue
      blend(pixels, offset, PALETTE.backdrop)

      const dx = px - center
      const dy = py - center
      const distance = Math.hypot(dx, dy)
      if (distance > radius + stroke) continue

      // Il disco del pianeta.
      if (distance <= radius) blend(pixels, offset, PALETTE.sphere)

      // Il contorno.
      if (Math.abs(distance - radius) <= stroke / 2) {
        blend(pixels, offset, PALETTE.accent)
        continue
      }
      if (distance > radius) continue

      // Equatore e due paralleli.
      for (const offsetY of [0, -0.46, 0.46]) {
        if (Math.abs(dy - offsetY * radius) <= stroke / 2) blend(pixels, offset, PALETTE.grid)
      }

      // Meridiani: ellissi verticali sempre più strette verso il centro.
      for (const ratio of [0.4, 0.78]) {
        const normalized = Math.hypot(dx / (radius * ratio), dy / radius)
        if (Math.abs(normalized - 1) * radius * ratio <= stroke / 2) {
          blend(pixels, offset, PALETTE.grid)
        }
      }
      // Il meridiano centrale, che degenera in una retta.
      if (Math.abs(dx) <= stroke / 2) blend(pixels, offset, PALETTE.grid)
    }
  }

  return downsample(pixels, dimension, size)
}

function downsample(source, sourceSize, targetSize) {
  const out = new Uint8ClampedArray(targetSize * targetSize * 4)
  const factor = sourceSize / targetSize

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const offset = ((y * factor + sy) * sourceSize + (x * factor + sx)) * 4
          r += source[offset]
          g += source[offset + 1]
          b += source[offset + 2]
          a += source[offset + 3]
        }
      }
      const samples = factor * factor
      const target = (y * targetSize + x) * 4
      out[target] = Math.round(r / samples)
      out[target + 1] = Math.round(g / samples)
      out[target + 2] = Math.round(b / samples)
      out[target + 3] = Math.round(a / samples)
    }
  }
  return out
}

// --- Scrittura PNG -------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  // compressione 0, filtro 0, interlacciamento 0: i byte restanti sono già zero.

  // Ogni riga è preceduta dal byte del filtro (0 = nessuno).
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Le icone che servono ------------------------------------------------

const ICONS = [
  { file: 'public/icons/icon-192.png', size: 192, padding: 0.12, rounded: true },
  { file: 'public/icons/icon-512.png', size: 512, padding: 0.12, rounded: true },
  // Maskable: il globo sta dentro il 65% centrale, così sopravvive a
  // qualunque ritaglio il sistema operativo decida di applicare.
  { file: 'public/icons/icon-192-maskable.png', size: 192, padding: 0.3, rounded: false },
  { file: 'public/icons/icon-512-maskable.png', size: 512, padding: 0.3, rounded: false },
  { file: 'public/icons/apple-touch-icon.png', size: 180, padding: 0.14, rounded: false },
]

for (const icon of ICONS) {
  const path = resolve(process.cwd(), icon.file)
  mkdirSync(dirname(path), { recursive: true })
  const pixels = drawIcon(icon.size, { padding: icon.padding, rounded: icon.rounded })
  writeFileSync(path, encodePng(pixels, icon.size))
  console.log(`${icon.file}  ${icon.size}x${icon.size}`)
}
