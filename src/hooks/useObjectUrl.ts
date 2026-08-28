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
