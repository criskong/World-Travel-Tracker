import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Plane } from 'lucide-react'
import { useTravelStore } from '../../store/travelStore'
import { recentVisits } from '../../utils/stats'
import { flagEmoji } from '../../utils/flag'
import { formatVisitDate } from '../../utils/formatDate'

/**
 * Viaggi recenti della Home. Come `StatsSection`, si sottoscrive da sé:
 * un viaggio aggiunto non fa passare nulla dal componente del globo.
 */
export function RecentTrips() {
  const visits = useTravelStore((state) => state.visits)
  const recent = useMemo(
    () => recentVisits({ manuallyMarked: [], visits }, 5),
    [visits],
  )

  return (
    <section aria-label="Recent trips" className="animate-fade-up">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Recent trips
        </h2>
        {recent.length > 0 && (
          <Link
            to="/trips"
            className="flex items-center gap-0.5 text-xs text-slate-500 transition-colors hover:text-accent"
          >
            All trips
            <ChevronRight size={13} aria-hidden />
          </Link>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="card mt-3 flex items-center gap-3 px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge">
            <Plane size={16} strokeWidth={1.6} className="text-slate-600" aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-slate-500">
            No trips recorded yet. Add one from a country’s details to see it here.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {recent.map(({ visit, country }) => (
            <li key={visit.id} className="card flex items-center gap-3 px-4 py-3">
              <span aria-hidden className="text-xl leading-none">
                {flagEmoji(visit.countryCode)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">
                  {country?.name ?? visit.countryCode}
                  {visit.city && <span className="text-slate-500"> · {visit.city}</span>}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays size={12} aria-hidden />
                  {formatVisitDate(visit.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
