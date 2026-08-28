import { useState } from 'react'
import { CalendarDays, ImageOff, MapPin, Trash2 } from 'lucide-react'
import { usePhoto } from '../../hooks/usePhoto'
import { formatVisitDate } from '../../utils/formatDate'
import type { Visit } from '../../types'

interface VisitCardProps {
  visit: Visit
  onRemove?: (id: string) => void
}

/** Una riga della lista dei viaggi, con foto se presente. */
export function VisitCard({ visit, onRemove }: VisitCardProps) {
  const { url, status } = usePhoto(visit.photoId)
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="rounded-xl border border-edge bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
            <CalendarDays size={13} className="shrink-0 text-slate-500" aria-hidden />
            {formatVisitDate(visit.date)}
          </p>
          {visit.city && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} className="shrink-0 text-slate-600" aria-hidden />
              {visit.city}
            </p>
          )}
        </div>

        {onRemove &&
          (confirming ? (
            <span className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onRemove(visit.id)}
                className="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25"
              >
                Delete
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete this trip"
              className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-surface-raised hover:text-red-300"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          ))}
      </div>

      {visit.note && (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
          {visit.note}
        </p>
      )}

      {visit.photoId && (
        <div className="mt-2.5 overflow-hidden rounded-lg border border-edge">
          {url !== null ? (
            <img src={url} alt="" loading="lazy" className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-16 items-center justify-center gap-2 text-xs text-slate-600">
              {status === 'missing' ? (
                <>
                  <ImageOff size={14} aria-hidden />
                  Photo not found
                </>
              ) : (
                'Loading photo…'
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
