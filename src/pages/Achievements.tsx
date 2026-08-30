import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { AchievementCard } from '../components/Achievements/AchievementCard'
import { ProgressBar } from '../components/UI/ProgressBar'
import { useTravelStore } from '../store/travelStore'
import { computeAchievements } from '../utils/achievements'
import { useTranslation } from '../i18n/useTranslation'
import { achievementText } from '../i18n/achievementText'
import type { Achievement } from '../utils/achievements'

/**
 * Le medaglie.
 *
 * Tutto ricalcolato da `computeAchievements` a ogni render: niente è
 * persistito, perché è stato derivato. Conseguenza voluta: importare un
 * backup rimette a posto anche gli achievement, senza codice dedicato.
 */
export default function Achievements() {
  const { t } = useTranslation()
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)

  const summary = useMemo(
    () => computeAchievements({ manuallyMarked, visits }),
    [manuallyMarked, visits],
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('achievements.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t('achievements.subtitle', {
            unlocked: summary.unlockedCount,
            total: summary.total,
          })}
          <span className="text-subtle"> · {t('achievements.basis')}</span>
        </p>
      </header>

      {summary.next !== null && <NextUp achievement={summary.next} />}

      {summary.unlocked.length > 0 && (
        <Group
          title={t('achievements.unlocked')}
          count={summary.unlocked.length}
          items={summary.unlocked}
        />
      )}

      {summary.locked.length > 0 && (
        <Group
          title={t('achievements.locked')}
          count={summary.locked.length}
          items={summary.locked}
        />
      )}

      {summary.next === null && (
        <p className="card px-6 py-8 text-center text-sm text-slate-400">
          {t('achievements.allDone')}
        </p>
      )}
    </div>
  )
}

/** Il bloccato più vicino, messo in evidenza: è il prossimo obiettivo. */
function NextUp({ achievement }: { achievement: Achievement }) {
  const translation = useTranslation()
  const { t } = translation
  const text = achievementText(translation, achievement)
  const remaining = achievement.target - achievement.current

  return (
    <section aria-label={t('achievements.next')} className="card animate-fade-up p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
        <Trophy size={14} className="text-accent" aria-hidden />
        {t('achievements.nextUp')}
      </div>

      <h2 className="mt-3 text-base font-semibold tracking-tight text-slate-100">{text.name}</h2>
      <p className="mt-1 text-sm text-muted">{text.description}</p>

      <div className="mt-4">
        <ProgressBar
          value={achievement.progress}
          label={`${text.name}: ${text.detail}`}
          size="md"
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{text.detail}</span>
        <span className="tabular-nums text-slate-400">
          {t('achievements.remaining', {
            count: remaining,
            percentage: Math.round(achievement.progress * 100),
          })}
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
