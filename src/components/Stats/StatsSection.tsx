import { useMemo } from 'react'
import { Compass, Globe, MapPin } from 'lucide-react'
import { useTravelStore } from '../../store/travelStore'
import { computeStats } from '../../utils/stats'
import { useTranslation } from '../../i18n/useTranslation'
import type { ContinentStat } from '../../utils/stats'

/**
 * Statistiche principali della Home.
 *
 * Si sottoscrive allo store per conto suo: il globo, che è un fratello nel
 * DOM, non viene toccato quando questi numeri cambiano.
 * Tutti i totali arrivano da `countries.ts` via `computeStats`.
 */
export function StatsSection() {
  const { t } = useTranslation()
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
    <section aria-label={t('stats.section')} className="animate-fade-up">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<MapPin size={16} aria-hidden />}
          label={t('stats.countriesVisited')}
          value={`${stats.visitedCount}`}
          suffix={`/ ${stats.totalCount}`}
        />
        <StatTile
          icon={<Globe size={16} aria-hidden />}
          label={t('stats.ofTheWorld')}
          value={`${stats.worldPercentage}`}
          suffix="%"
        />
        <StatTile
          icon={<Compass size={16} aria-hidden />}
          label={t('stats.territories')}
          value={`${stats.territoriesVisited}`}
          suffix={t('stats.beyondThe195')}
        />
      </div>

      <h2 className="mt-6 text-xs font-medium uppercase tracking-wider text-muted">
        {t('stats.byContinent')}
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

function ContinentRow({ stat }: { stat: ContinentStat }) {
  const { t, continent } = useTranslation()

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-slate-400 sm:w-32">
        {continent(stat.continent)}
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"
        role="img"
        aria-label={t('stats.continentBar#', {
          continent: continent(stat.continent),
          count: stat.visited,
          total: stat.total,
          percentage: stat.percentage,
        })}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${stat.percentage}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
        {stat.visited}/{stat.total}
      </span>
    </div>
  )
}

/** Primo avvio: nessun Paese visitato. Un invito, non un vuoto. */
function EmptyState() {
  const { t } = useTranslation()

  return (
    <section className="card animate-fade-up px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim">
        <Compass size={22} strokeWidth={1.6} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-100">
        {t('stats.empty.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {t('stats.empty.body')}
      </p>
      <p className="mt-4 text-xs text-subtle">{t('stats.empty.footer')}</p>
    </section>
  )
}
