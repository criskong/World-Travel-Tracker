import { useCallback, useMemo, useState } from 'react'
import { MapPin, Plane } from 'lucide-react'
import { CountryDetailsDrawer } from '../components/CountryDetails/CountryDetailsDrawer'
import { useTravelStore } from '../store/travelStore'
import { groupVisitsByYear } from '../utils/tripsTimeline'
import { flagEmoji } from '../utils/flag'
import { useTranslation } from '../i18n/useTranslation'
import { usePhotos } from '../hooks/usePhotos'
import type { TimelineEntry } from '../utils/tripsTimeline'

/** Timeline dei viaggi, raggruppata per anno dal più recente. */
export default function Trips() {
  const { t } = useTranslation()
  const visits = useTravelStore((state) => state.visits)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const years = useMemo(() => groupVisitsByYear(visits), [visits])
  const handleClose = useCallback(() => setSelectedCode(null), [])
  const handleSelect = useCallback((code: string) => setSelectedCode(code), [])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">{t('trips.title')}</h1>
        <p className="mt-1 text-sm text-muted">
          {visits.length === 0
            ? t('trips.subtitleEmpty')
            : t('trips.subtitle', {
                trips: t('common.trip#', { count: visits.length }),
                years: t('common.year#', { count: years.length }),
              })}
        </p>
      </header>

      {years.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {years.map((group) => (
            <section key={group.year} aria-label={t('trips.inYear', { year: group.year })}>
              <div className="flex items-baseline gap-3">
                <h2 className="font-mono text-sm font-semibold tracking-wider text-accent">
                  {group.year}
                </h2>
                <span className="h-px flex-1 bg-edge" />
                <span className="text-xs tabular-nums text-subtle">
                  {t('common.trip#', { count: group.entries.length })}
                </span>
              </div>

              <ol className="mt-3 flex flex-col gap-2">
                {group.entries.map((entry) => (
                  <TimelineRow key={entry.visit.id} entry={entry} onSelect={handleSelect} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <CountryDetailsDrawer code={selectedCode} onClose={handleClose} />
    </div>
  )
}

function TimelineRow({
  entry,
  onSelect,
}: {
  entry: TimelineEntry
  onSelect: (code: string) => void
}) {
  const { visit, country } = entry
  const { country: countryLabel, date } = useTranslation()
  const { urls } = usePhotos(visit.photoIds)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(visit.countryCode)}
        className="flex w-full items-start gap-3 rounded-xl border border-edge bg-surface p-3 text-left transition-colors hover:border-edge-strong hover:bg-surface-raised"
      >
        <span aria-hidden className="text-xl leading-none">
          {flagEmoji(visit.countryCode)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-200">
            {country ? countryLabel(country.code) : visit.countryCode}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <span className="tabular-nums">{date(visit.date)}</span>
            {visit.city && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} aria-hidden />
                  {visit.city}
                </span>
              </>
            )}
          </span>
          {visit.note && (
            <span className="mt-1.5 block whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
              {visit.note}
            </span>
          )}
        </span>

        {urls[0] !== undefined && (
          <span className="relative shrink-0">
            <img
              src={urls[0]}
              alt=""
              loading="lazy"
              className="h-14 w-14 rounded-lg border border-edge object-cover"
            />
            {urls.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[10px] font-medium tabular-nums text-slate-200">
                {urls.length}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  )
}

function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="card px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim">
        <Plane size={22} strokeWidth={1.6} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-100">
        {t('trips.empty.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {t('trips.empty.body')}
      </p>
    </div>
  )
}
