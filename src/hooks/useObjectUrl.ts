import { useEffect, useState } from 'react'

/**
 * Object URL per un Blob, revocato quando il Blob cambia e allo smontaggio.
 *
 * Ogni `createObjectURL` tiene il Blob vivo in memoria finché non viene
 * revocato: senza la revoca, sfogliare i dettagli di venti Paesi con foto
 * lascia venti immagini appese per tutta la sessione.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return url
}

/**
 * Object URL per una lista di Blob, con la stessa disciplina di revoca.
 *
 * Serve alle anteprime multiple: senza, scegliere dieci foto e cambiarle un
 * paio di volte lascerebbe appesi trenta Blob per tutta la sessione.
 */
export function useObjectUrls(blobs: readonly Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    if (blobs.length === 0) {
      setUrls([])
      return
    }

    const created = blobs.map((blob) => URL.createObjectURL(blob))
    setUrls(created)

    return () => {
      for (const url of created) URL.revokeObjectURL(url)
    }
  }, [blobs])

  return urls
}
