import { useMemo } from 'react'
import { CalendarRange, ChartColumn, Compass, Globe, MapPin, Plane } from 'lucide-react'
import { ProgressBar } from '../components/UI/ProgressBar'
import { useTravelStore } from '../store/travelStore'
import { computeStats, unvisitedByContinent, visitsPerYear } from '../utils/stats'
import { flagEmoji } from '../utils/flag'
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">Statistics</h1>
        <p className="mt-1 text-sm text-slate-500">
          {nothingYet
            ? 'Numbers will appear here as soon as you mark your first country.'
            : `${stats.visitedCount} of ${stats.totalCount} countries · ${stats.worldPercentage}% of the world`}
        </p>
      </header>

      {nothingYet ? (
        <EmptyState />
      ) : (
        <>
          <section aria-label="Totals" className="grid animate-fade-up gap-3 sm:grid-cols-2">
            <Tile
              icon={<MapPin size={16} aria-hidden />}
              label="Countries visited"
              value={`${stats.visitedCount}`}
              suffix={`/ ${stats.totalCount}`}
            />
            <Tile
              icon={<Globe size={16} aria-hidden />}
              label="Of the world"
              value={`${stats.worldPercentage}`}
              suffix="%"
            />
            <Tile
              icon={<Compass size={16} aria-hidden />}
              label="Territories"
              value={`${stats.territoriesVisited}`}
              suffix="beyond the 195"
            />
            <Tile
              icon={<Plane size={16} aria-hidden />}
              label="Trips recorded"
              value={`${stats.visitCount}`}
              suffix={`across ${stats.countriesWithVisits} ${
                stats.countriesWithVisits === 1 ? 'country' : 'countries'
              }`}
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
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span className="text-slate-600">{icon}</span>
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
          {value}
        </span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </p>
    </div>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">{children}</h2>
      {hint !== undefined && <span className="text-xs text-slate-600">{hint}</span>}
    </div>
  )
}

function ContinentDetail({ stats }: { stats: ContinentStat[] }) {
  return (
    <section aria-label="By continent" className="animate-fade-up">
      <SectionTitle hint="Of the 195 UN states">By continent</SectionTitle>

      <ul className="mt-3 flex flex-col gap-4">
        {stats.map((item) => (
          <li key={item.continent}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">{item.continent}</span>
              <span className="text-xs tabular-nums text-slate-500">
                <span className="text-slate-300">{item.visited}</span>
                <span className="text-slate-600"> / {item.total}</span>
                <span className="ml-2 text-slate-600">{item.percentage}%</span>
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={item.total === 0 ? 0 : item.visited / item.total}
                label={`${item.continent}: ${item.visited} of ${item.total} countries, ${item.percentage}%`}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {item.total - item.visited === 0
                ? 'Every country visited'
                : `${item.total - item.visited} still to go`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StillToVisit({ backlog }: { backlog: ContinentBacklog[] }) {
  const remaining = backlog.reduce((total, item) => total + item.missing.length, 0)

  return (
    <section aria-label="Still to visit" className="animate-fade-up">
      <SectionTitle hint={`${remaining} left`}>Still to visit</SectionTitle>

      {remaining === 0 ? (
        <p className="card mt-3 px-5 py-6 text-center text-sm text-slate-400">
          Nothing left. You have visited every one of the 195 UN states.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {backlog
            .filter((item) => item.missing.length > 0)
            .map((item) => (
              <li key={item.continent}>
                <details className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised">
                    <span className="text-sm font-medium text-slate-300">{item.continent}</span>
                    <span className="flex items-center gap-2 text-xs tabular-nums text-slate-500">
                      {item.missing.length} to go
                      <span
                        aria-hidden
                        className="text-slate-600 transition-transform group-open:rotate-90"
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
                        {country.name}
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
  const peak = years.reduce((max, item) => Math.max(max, item.count), 0)
  const total = years.reduce((sum, item) => sum + item.count, 0)

  return (
    <section aria-label="Trips by year" className="animate-fade-up">
      <SectionTitle hint={years.length > 0 ? `${total} trips` : undefined}>
        Trips by year
      </SectionTitle>

      {years.length === 0 ? (
        <p className="card mt-3 flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
          <CalendarRange size={18} strokeWidth={1.6} className="shrink-0 text-slate-600" aria-hidden />
          No trips recorded yet. Add one from a country to see how your years compare.
        </p>
      ) : (
        <div className="card mt-3 overflow-x-auto scroll-area p-4">
          <ol
            className="flex min-w-full items-end gap-2"
            style={{ minHeight: '9rem' }}
            aria-label={`Trips per year, from ${years[0]?.year} to ${years[years.length - 1]?.year}`}
          >
            {years.map((item) => (
              <li
                key={item.year}
                className="flex min-w-9 flex-1 flex-col items-center justify-end gap-2"
                title={`${item.year}: ${item.count} ${item.count === 1 ? 'trip' : 'trips'}`}
              >
                <span className="text-xs tabular-nums text-slate-500">
                  {item.count > 0 ? item.count : ''}
                </span>
                <div
                  className={`w-full rounded-t-md transition-[height] duration-500 ease-out ${
                    item.count > 0 ? 'bg-accent/70' : 'bg-white/5'
                  }`}
                  style={{ height: `${peak === 0 ? 0 : Math.max(4, (item.count / peak) * 100)}px` }}
                />
                <span className="font-mono text-[0.625rem] tabular-nums text-slate-600">
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
  return (
    <section className="card animate-fade-up px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim">
        <ChartColumn size={22} strokeWidth={1.6} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-100">
        Nothing to measure yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Mark a country as visited, or add a trip with its date, and this page will fill up:
        coverage by continent, what is left to see, and how your years compare.
      </p>
      <p className="mt-4 text-xs text-slate-600">0 / 195 countries · 0% of the world</p>
    </section>
  )
}
