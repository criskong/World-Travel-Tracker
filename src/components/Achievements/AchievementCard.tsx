import { Check, Compass, Crown, Footprints, Globe2, Lock, Map, Plane, Trophy } from 'lucide-react'
import { ProgressBar } from '../UI/ProgressBar'
import type { LucideIcon } from 'lucide-react'
import type { Achievement, AchievementId } from '../../utils/achievements'

/**
 * L'icona è una scelta di presentazione, quindi vive qui e non in
 * `achievements.ts`, che resta logica pura e testabile senza React.
 */
const ICONS: Record<AchievementId, LucideIcon> = {
  'first-step': Footprints,
  explorer: Compass,
  'travel-addict': Plane,
  'world-traveler': Globe2,
  'globe-trotter': Trophy,
  'continent-master': Map,
  'world-explorer': Crown,
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const Icon = ICONS[achievement.id]
  const { unlocked } = achievement

  return (
    <article
      className={`card flex gap-3.5 p-4 transition-colors ${
        unlocked ? 'border-accent/25 bg-accent-dim' : ''
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          unlocked ? 'bg-accent/15 text-accent' : 'bg-white/5 text-slate-600'
        }`}
      >
        <Icon size={20} strokeWidth={1.7} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className={`truncate text-sm font-semibold ${
              unlocked ? 'text-slate-100' : 'text-slate-400'
            }`}
          >
            {achievement.name}
          </h3>
          {unlocked ? (
            <Check size={14} className="shrink-0 text-accent" aria-label="Unlocked" />
          ) : (
            <Lock size={12} className="shrink-0 text-slate-600" aria-label="Locked" />
          )}
        </div>

        <p className="mt-0.5 text-xs text-slate-500">{achievement.description}</p>

        {unlocked ? (
          <p className="mt-2 text-xs text-accent">{achievement.detail}</p>
        ) : (
          <div className="mt-2.5 flex items-center gap-3">
            <ProgressBar
              value={achievement.progress}
              label={`${achievement.name}: ${achievement.detail}`}
              tone="muted"
            />
            <span className="shrink-0 text-xs tabular-nums text-slate-500">
              {achievement.current}/{achievement.target}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
