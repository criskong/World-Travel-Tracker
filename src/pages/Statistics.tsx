import { useMemo } from 'react'
import { CalendarRange, ChartColumn, Compass, Globe, MapPin, Plane } from 'lucide-react'
import { ProgressBar } from '../components/UI/ProgressBar'
import { useTravelStore } from '../store/travelStore'
import { computeStats, unvisitedByContinent, visitsPerYear } from '../utils/stats'
import { flagEmoji } from '../utils/flag'
import { useTranslation } from '../i18n/useTranslation'
import type { ContinentBacklog, ContinentStat, YearCount } from '../utils/stats'

/**
 * Il quadro completo.
 *
 * Ogni totale arriva da `computeStats` e dai suoi compagni in `stats.ts`, che
 * contano su `UN_MEMBER_LIST`. Le feature del GeoJSON non entrano mai in un
 * numero: sono 242, includono territori e dipendenze e in un caso danno lo
 * stesso codice a più feature (CLAUDE.md, Dati geografici).
 */
export default function Statistics() {
  const { t } = useTranslation()
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)

  const data = useMemo(() => ({ manuallyMarked, visits }), [manuallyMarked, visits])
  const stats = useMemo(() => computeStats(data), [data])
  const backlog = useMemo(() => unvisitedByContinent(data), [data])
  const years = useMemo(() => visitsPerYear(data), [data])

  const nothingYet = stats.visitedCount === 0 && stats.territoriesVisited === 0 && visits.length === 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('statistics.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {nothingYet
            ? t('statistics.subtitleEmpty')
            : t('statistics.subtitle#', {
                count: stats.visitedCount,
                total: stats.totalCount,
                percentage: stats.worldPercentage,
              })}
        </p>
      </header>

      {nothingYet ? (
        <EmptyState />
      ) : (
        <>
          <section
            aria-label={t('statistics.totals')}
            className="grid animate-fade-up gap-3 sm:grid-cols-2"
          >
            <Tile
              icon={<MapPin size={16} aria-hidden />}
              label={t('stats.countriesVisited')}
              value={`${stats.visitedCount}`}
              suffix={`/ ${stats.totalCount}`}
            />
            <Tile
              icon={<Globe size={16} aria-hidden />}
              label={t('stats.ofTheWorld')}
              value={`${stats.worldPercentage}`}
              suffix="%"
            />
            <Tile
              icon={<Compass size={16} aria-hidden />}
              label={t('stats.territories')}
              value={`${stats.territoriesVisited}`}
              suffix={t('stats.beyondThe195')}
            />
            <Tile
              icon={<Plane size={16} aria-hidden />}
              label={t('statistics.tripsRecorded')}
              value={`${stats.visitCount}`}
              suffix={t('statistics.acrossCountries', {
                countries: t('common.country#', { count: stats.countriesWithVisits }),
              })}
            />
          </section>

          <ContinentDetail stats={stats.byContinent} />
          <StillToVisit backlog={backlog} />
          <TripsByYear years={years} />
        </>
      )}
    </div>
  )
}

interface TileProps {
  icon: React.ReactNode
  label: string
  value: string
  suffix: string
}

function Tile({ icon, label, value, suffix }: TileProps) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="text-subtle">{icon}</span>
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
          {value}
        </span>
        <span className="text-xs text-muted">{suffix}</span>
      </p>
    </div>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{children}</h2>
      {hint !== undefined && <span className="text-xs text-subtle">{hint}</span>}
    </div>
  )
}

function ContinentDetail({ stats }: { stats: ContinentStat[] }) {
  const { t, continent } = useTranslation()

  return (
    <section aria-label={t('stats.byContinent')} className="animate-fade-up">
      <SectionTitle hint={t('statistics.ofThe195')}>{t('stats.byContinent')}</SectionTitle>

      <ul className="mt-3 flex flex-col gap-4">
        {stats.map((item) => (
          <li key={item.continent}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">
                {continent(item.continent)}
              </span>
              <span className="text-xs tabular-nums text-muted">
                <span className="text-slate-300">{item.visited}</span>
                <span className="text-subtle"> / {item.total}</span>
                <span className="ml-2 text-subtle">{item.percentage}%</span>
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={item.total === 0 ? 0 : item.visited / item.total}
                label={t('stats.continentBar#', {
                  continent: continent(item.continent),
                  count: item.visited,
                  total: item.total,
                  percentage: item.percentage,
                })}
              />
            </div>
            <p className="mt-1.5 text-xs text-subtle">
              {item.total - item.visited === 0
                ? t('statistics.everyCountryVisited')
                : t('statistics.stillToGo', { count: item.total - item.visited })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StillToVisit({ backlog }: { backlog: ContinentBacklog[] }) {
  const { t, continent, country: countryLabel } = useTranslation()
  const remaining = backlog.reduce((total, item) => total + item.missing.length, 0)

  return (
    <section aria-label={t('statistics.stillToVisit')} className="animate-fade-up">
      <SectionTitle hint={t('statistics.left', { count: remaining })}>
        {t('statistics.stillToVisit')}
      </SectionTitle>

      {remaining === 0 ? (
        <p className="card mt-3 px-5 py-6 text-center text-sm text-slate-400">
          {t('statistics.nothingLeft')}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {backlog
            .filter((item) => item.missing.length > 0)
            .map((item) => (
              <li key={item.continent}>
                <details className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised">
                    <span className="text-sm font-medium text-slate-300">
                      {continent(item.continent)}
                    </span>
                    <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                      {t('statistics.toGo', { count: item.missing.length })}
                      <span
                        aria-hidden
                        className="text-subtle transition-transform group-open:rotate-90"
                      >
                        ›
                      </span>
                    </span>
                  </summary>
                  <ul className="flex flex-wrap gap-1.5 border-t border-edge px-4 py-3">
                    {item.missing.map((country) => (
                      <li
                        key={country.code}
                        className="flex items-center gap-1.5 rounded-lg border border-edge bg-base-900/40 px-2 py-1 text-xs text-slate-400"
                      >
                        <span aria-hidden>{flagEmoji(country.code)}</span>
                        {countryLabel(country.code)}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}

function TripsByYear({ years }: { years: YearCount[] }) {
  const { t } = useTranslation()
  const peak = years.reduce((max, item) => Math.max(max, item.count), 0)
  const total = years.reduce((sum, item) => sum + item.count, 0)

  return (
    <section aria-label={t('statistics.tripsByYear')} className="animate-fade-up">
      <SectionTitle hint={years.length > 0 ? t('common.trip#', { count: total }) : undefined}>
        {t('statistics.tripsByYear')}
      </SectionTitle>

      {years.length === 0 ? (
        <p className="card mt-3 flex items-center gap-3 px-5 py-6 text-sm text-muted">
          <CalendarRange size={18} strokeWidth={1.6} className="shrink-0 text-subtle" aria-hidden />
          {t('statistics.noTripsYet')}
        </p>
      ) : (
        <div className="card mt-3 overflow-x-auto scroll-area p-4">
          <ol
            className="flex min-w-full items-end gap-2"
            style={{ minHeight: '9rem' }}
            aria-label={t('statistics.chartLabel', {
              first: years[0]?.year ?? '',
              last: years[years.length - 1]?.year ?? '',
            })}
          >
            {years.map((item) => (
              <li
                key={item.year}
                className="flex min-w-9 flex-1 flex-col items-center justify-end gap-2"
                title={t('statistics.yearTrips', {
                  year: item.year,
                  trips: t('common.trip#', { count: item.count }),
                })}
              >
                <span className="text-xs tabular-nums text-muted">
                  {item.count > 0 ? item.count : ''}
                </span>
                <div
                  className={`w-full rounded-t-md transition-[height] duration-500 ease-out ${
                    item.count > 0 ? 'bg-accent/70' : 'bg-white/5'
                  }`}
                  style={{ height: `${peak === 0 ? 0 : Math.max(4, (item.count / peak) * 100)}px` }}
                />
                <span className="font-mono text-[0.625rem] tabular-nums text-subtle">
                  {String(item.year).slice(2)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

/** Primo avvio: nessun dato. Un invito, non una pagina vuota. */
function EmptyState() {
  const { t } = useTranslation()

  return (
    <section className="card animate-fade-up px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim">
        <ChartColumn size={22} strokeWidth={1.6} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-100">
        {t('statistics.empty.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {t('statistics.empty.body')}
      </p>
      <p className="mt-4 text-xs text-subtle">{t('stats.empty.footer')}</p>
    </section>
  )
}
