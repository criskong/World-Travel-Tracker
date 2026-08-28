import { useEffect, useState } from 'react'
import { loadPhoto } from '../services/storage'
import { useObjectUrl } from './useObjectUrl'

export type PhotoStatus = 'idle' | 'loading' | 'ready' | 'missing'

/**
 * Carica la foto di un viaggio dal suo `photoId` e ne espone un object URL
 * con ciclo di vita gestito da `useObjectUrl`.
 */
export function usePhoto(photoId: string | undefined): { url: string | null; status: PhotoStatus } {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [status, setStatus] = useState<PhotoStatus>('idle')
  const url = useObjectUrl(blob)

  useEffect(() => {
    if (!photoId) {
      setBlob(null)
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    loadPhoto(photoId)
      .then((found) => {
        if (cancelled) return
        setBlob(found ?? null)
        setStatus(found ? 'ready' : 'missing')
      })
      .catch(() => {
        if (cancelled) return
        setBlob(null)
        setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [photoId])

  return { url, status }
}
