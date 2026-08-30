import { useEffect, useState } from 'react'
import { loadPhoto } from '../services/storage'
import { useObjectUrls } from './useObjectUrl'

export type PhotosStatus = 'idle' | 'loading' | 'ready' | 'missing'

export interface LoadedPhotos {
  urls: string[]
  status: PhotosStatus
  /** Quante foto il viaggio referenzia ma non si trovano piu. */
  missing: number
}

/**
 * Carica le foto di un viaggio dai suoi `photoIds`.
 *
 * `missing` non e un dettaglio: dopo un ripristino su un dispositivo nuovo i
 * riferimenti possono esserci senza i Blob, e l'utente deve vedere che manca
 * qualcosa invece di trovarsi meno foto senza spiegazione.
 */
export function usePhotos(photoIds: readonly string[] | undefined): LoadedPhotos {
  const [blobs, setBlobs] = useState<Blob[]>([])
  const [status, setStatus] = useState<PhotosStatus>('idle')
  const [missing, setMissing] = useState(0)
  const urls = useObjectUrls(blobs)

  // La lista di id come chiave stabile: un array nuovo a ogni render
  // rilancerebbe il caricamento all'infinito.
  const key = photoIds?.join(',') ?? ''

  useEffect(() => {
    const ids = key.length === 0 ? [] : key.split(',')
    if (ids.length === 0) {
      setBlobs([])
      setMissing(0)
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    Promise.all(ids.map((id) => loadPhoto(id).catch(() => undefined)))
      .then((found) => {
        if (cancelled) return
        const present = found.filter((blob): blob is Blob => blob !== undefined)
        setBlobs(present)
        setMissing(ids.length - present.length)
        setStatus(present.length > 0 ? 'ready' : 'missing')
      })
      .catch(() => {
        if (cancelled) return
        setBlobs([])
        setMissing(ids.length)
        setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [key])

  return { urls, status, missing }
}
