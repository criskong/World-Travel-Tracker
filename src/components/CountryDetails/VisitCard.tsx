import { useState } from 'react'
import { CalendarDays, ImageOff, MapPin, Trash2 } from 'lucide-react'
import { usePhotos } from '../../hooks/usePhotos'
import { useTranslation } from '../../i18n/useTranslation'
import type { Visit } from '../../types'

interface VisitCardProps {
  visit: Visit
  onRemove?: (id: string) => void
}

/** Una riga della lista dei viaggi, con foto se presente. */
export function VisitCard({ visit, onRemove }: VisitCardProps) {
  const { t, date } = useTranslation()
  const { urls, status, missing } = usePhotos(visit.photoIds)
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="rounded-xl border border-edge bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
            <CalendarDays size={13} className="shrink-0 text-muted" aria-hidden />
            {date(visit.date)}
          </p>
          {visit.city && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} className="shrink-0 text-subtle" aria-hidden />
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
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => onRemove(visit.id)}
                className="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/25"
              >
                {t('common.delete')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={t('visit.remove')}
              className="shrink-0 rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface-raised hover:text-red-300"
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

      {(visit.photoIds?.length ?? 0) > 0 && (
        <div className="mt-2.5">
          {urls.length > 0 && (
            <ul className={urls.length === 1 ? '' : 'grid grid-cols-3 gap-1.5'}>
              {urls.map((url) => (
                <li key={url} className="overflow-hidden rounded-lg border border-edge">
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className={urls.length === 1 ? 'h-36 w-full object-cover' : 'h-20 w-full object-cover'}
                  />
                </li>
              ))}
            </ul>
          )}

          {/*
            Un riferimento senza il suo Blob capita dopo un ripristino su un
            dispositivo nuovo: si dice, invece di mostrare semplicemente meno
            foto e lasciare il dubbio.
          */}
          {missing > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
              <ImageOff size={13} aria-hidden />
              {t('visit.photosMissing#', { count: missing })}
            </p>
          )}

          {urls.length === 0 && missing === 0 && status === 'loading' && (
            <p className="text-xs text-subtle">{t('visit.photoLoading')}</p>
          )}
        </div>
      )}
    </li>
  )
}
