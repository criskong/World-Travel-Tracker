import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { AchievementCard } from '../components/Achievements/AchievementCard'
import { ProgressBar } from '../components/UI/ProgressBar'
import { useTravelStore } from '../store/travelStore'
import { computeAchievements } from '../utils/achievements'
import type { Achievement } from '../utils/achievements'

/**
 * Le medaglie.
 *
 * Tutto ricalcolato da `computeAchievements` a ogni render: niente è
 * persistito, perché è stato derivato. Conseguenza voluta: importare un
 * backup rimette a posto anche gli achievement, senza codice dedicato.
 */
export default function Achievements() {
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)

  const summary = useMemo(
    () => computeAchievements({ manuallyMarked, visits }),
    [manuallyMarked, visits],
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">Achievements</h1>
        <p className="mt-1 text-sm text-muted">
          {summary.unlockedCount} of {summary.total} unlocked
          <span className="text-subtle"> · based on the 195 UN states</span>
        </p>
      </header>

      {summary.next !== null && <NextUp achievement={summary.next} />}

      {summary.unlocked.length > 0 && (
        <Group title="Unlocked" count={summary.unlocked.length} items={summary.unlocked} />
      )}

      {summary.locked.length > 0 && (
        <Group title="Locked" count={summary.locked.length} items={summary.locked} />
      )}

      {summary.next === null && (
        <p className="card px-6 py-8 text-center text-sm text-slate-400">
          Every achievement unlocked. There is nothing left on this page — only on the map.
        </p>
      )}
    </div>
  )
}

/** Il bloccato più vicino, messo in evidenza: è il prossimo obiettivo. */
function NextUp({ achievement }: { achievement: Achievement }) {
  const remaining = achievement.target - achievement.current

  return (
    <section aria-label="Next achievement" className="card animate-fade-up p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
        <Trophy size={14} className="text-accent" aria-hidden />
        Next up
      </div>

      <h2 className="mt-3 text-base font-semibold tracking-tight text-slate-100">
        {achievement.name}
      </h2>
      <p className="mt-1 text-sm text-muted">{achievement.description}</p>

      <div className="mt-4">
        <ProgressBar
          value={achievement.progress}
          label={`${achievement.name}: ${achievement.detail}`}
          size="md"
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{achievement.detail}</span>
        <span className="tabular-nums text-slate-400">
          {remaining} to go · {Math.round(achievement.progress * 100)}%
        </span>
      </div>
    </section>
  )
}

function Group({
  title,
  count,
  items,
}: {
  title: string
  count: number
  items: Achievement[]
}) {
  return (
    <section aria-label={title} className="animate-fade-up">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h2>
        <span className="text-xs tabular-nums text-subtle">{count}</span>
      </div>

      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {items.map((achievement) => (
          <li key={achievement.id}>
            <AchievementCard achievement={achievement} />
          </li>
        ))}
      </ul>
    </section>
  )
}
