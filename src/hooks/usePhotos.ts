import { useEffect, useState } from 'react'
import { loadPhoto } from '../services/storage'
import { useObjectUrls } from './useObjectUrl'

export type PhotosStatus = 'idle' | 'loading' | 'ready' | 'missing'

export interface LoadedPhoto {
  id: string
  url: string
}

export interface LoadedPhotos {
  urls: string[]
  /** Le stesse foto con il loro id: serve a chi deve toglierne una precisa. */
  items: LoadedPhoto[]
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
  const [ids, setIds] = useState<string[]>([])
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
      setIds([])
      setMissing(0)
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    Promise.all(ids.map((id) => loadPhoto(id).catch(() => undefined)))
      .then((found) => {
        if (cancelled) return
        const present = found
          .map((blob, index) => ({ id: ids[index]!, blob }))
          .filter((entry): entry is { id: string; blob: Blob } => entry.blob !== undefined)
        setBlobs(present.map((entry) => entry.blob))
        setIds(present.map((entry) => entry.id))
        setMissing(ids.length - present.length)
        setStatus(present.length > 0 ? 'ready' : 'missing')
      })
      .catch(() => {
        if (cancelled) return
        setBlobs([])
        setIds([])
        setMissing(ids.length)
        setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [key])

  // Gli URL nascono dai Blob nello stesso ordine degli id: la coppia regge
  // finche `useObjectUrls` non ha ancora aggiornato — in quel frame e vuota.
  const items = urls.length === ids.length ? urls.map((url, index) => ({ id: ids[index]!, url })) : []

  return { urls, items, status, missing }
}
