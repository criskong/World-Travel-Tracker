/**
 * Preparazione di una foto prima di salvarla.
 *
 * Le foto escono dai telefoni grandi e in formati che non tutti i browser
 * leggono: un iPhone scatta in HEIC, e una sola foto da 24 megapixel pesa
 * quanto cento viaggi di testo. Qui ogni immagine viene DECODIFICATA dal
 * browser — che sa leggere quello che il suo sistema sa leggere, HEIC su iOS
 * compreso — poi ridotta a un lato massimo e ricodificata in JPEG.
 *
 * Il risultato e piccolo (di norma 200-600 KB), in un formato che si apre
 * ovunque, e con l'orientamento EXIF gia applicato: `<img>` lo applica in
 * decodifica, quindi il canvas riceve i pixel gia girati.
 *
 * Se il browser non riesce a decodificare il file — HEIC su Chrome, per
 * esempio — si rifiuta con un errore comprensibile invece di salvare un Blob
 * che poi nessuna `<img>` saprebbe mostrare.
 */

/** Lato massimo dopo il ridimensionamento. Basta per un telefono e un monitor. */
export const MAX_PHOTO_DIMENSION = 2048
/** Qualita JPEG: sotto 0,8 si vedono gli artefatti sui cieli, sopra 0,9 pesa il doppio. */
export const PHOTO_JPEG_QUALITY = 0.85
/** Oltre questa dimensione una foto e gia "abbastanza piccola" e si tiene com'e. */
const KEEP_AS_IS_BYTES = 600 * 1024

export class PhotoDecodeError extends Error {
  constructor(message = 'undecodable image') {
    super(message)
    this.name = 'PhotoDecodeError'
  }
}

/** Il browser sa disegnare su un canvas? In jsdom no, e allora si passa oltre. */
function canvasAvailable(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.createElement('canvas').getContext('2d') !== null
  } catch {
    return false
  }
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    const done = () => URL.revokeObjectURL(url)
    image.onload = () => {
      done()
      resolve(image)
    }
    image.onerror = () => {
      done()
      reject(new PhotoDecodeError())
    }
    image.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoDecodeError('encode failed'))),
      'image/jpeg',
      PHOTO_JPEG_QUALITY,
    )
  })
}

/**
 * Restituisce la foto pronta da salvare. Lancia `PhotoDecodeError` se il
 * browser non la sa leggere.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  // Le GIF possono essere animate: ricodificarle le congelerebbe.
  if (file.type === 'image/gif') return file
  // Senza canvas (ambiente di test) non si puo fare niente di utile: il file
  // passa com'e, e la validazione a monte ha gia fatto il suo.
  if (!canvasAvailable()) return file

  const image = await loadImage(file)
  const { naturalWidth: width, naturalHeight: height } = image
  if (width === 0 || height === 0) throw new PhotoDecodeError()

  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(width, height))
  const alreadyFine = scale === 1 && file.type === 'image/jpeg' && file.size <= KEEP_AS_IS_BYTES
  if (alreadyFine) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) return file
  // Sfondo bianco: un PNG trasparente in JPEG diventerebbe nero.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return toBlob(canvas)
}
