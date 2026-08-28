import { useMemo } from 'react'
import { Compass, Globe, MapPin } from 'lucide-react'
import { useTravelStore } from '../../store/travelStore'
import { computeStats } from '../../utils/stats'
import type { ContinentStat } from '../../utils/stats'

/**
 * Statistiche principali della Home.
 *
 * Si sottoscrive allo store per conto suo: il globo, che è un fratello nel
 * DOM, non viene toccato quando questi numeri cambiano.
 * Tutti i totali arrivano da `countries.ts` via `computeStats`.
 */
export function StatsSection() {
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)

  const stats = useMemo(
    () => computeStats({ manuallyMarked, visits }),
    [manuallyMarked, visits],
  )

  if (stats.visitedCount === 0 && stats.territoriesVisited === 0) {
    return <EmptyState />
  }

  return (
    <section aria-label="Statistics" className="animate-fade-up">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<MapPin size={16} aria-hidden />}
          label="Countries visited"
          value={`${stats.visitedCount}`}
          suffix={`/ ${stats.totalCount}`}
        />
        <StatTile
          icon={<Globe size={16} aria-hidden />}
          label="Of the world"
          value={`${stats.worldPercentage}`}
          suffix="%"
        />
        <StatTile
          icon={<Compass size={16} aria-hidden />}
          label="Territories"
          value={`${stats.territoriesVisited}`}
          suffix="beyond the 195"
        />
      </div>

      <h2 className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">
        By continent
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {stats.byContinent.map((item) => (
          <li key={item.continent}>
            <ContinentRow stat={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  suffix: string
}

function StatTile({ icon, label, value, suffix }: StatTileProps) {
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

function ContinentRow({ stat }: { stat: ContinentStat }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-slate-400 sm:w-32">
        {stat.continent}
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"
        role="img"
        aria-label={`${stat.continent}: ${stat.visited} of ${stat.total}, ${stat.percentage}%`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${stat.percentage}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-slate-500">
        {stat.visited}/{stat.total}
      </span>
    </div>
  )
}

/** Primo avvio: nessun Paese visitato. Un invito, non un vuoto. */
function EmptyState() {
  return (
    <section className="card animate-fade-up px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim">
        <Compass size={22} strokeWidth={1.6} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-100">
        Your world is still waiting
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Spin the globe and tap a country to open its details. Mark it as visited from
        there, and your numbers will show up here.
      </p>
      <p className="mt-4 text-xs text-slate-600">0 / 195 countries · 0% of the world</p>
    </section>
  )
}
