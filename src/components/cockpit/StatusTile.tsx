import { motion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'
import GlassPanel from './GlassPanel'
import { healthLabel, healthTone, type HealthFactor } from '../../lib/health'
import { cn, formatDate } from '../../lib/utils'

const toneVar: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'var(--color-ok)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
}
const map: Record<HealthFactor['status'], 'ok' | 'warn' | 'danger'> = {
  good: 'ok',
  warn: 'warn',
  bad: 'danger',
  missing: 'danger',
}
const fillFor: Record<HealthFactor['status'], number> = { good: 1, warn: 0.5, bad: 0.15, missing: 0.04 }

/** Cockpit hero status tile: animated gauge + live per-factor bars, on glass. */
export default function StatusTile({ score, factors }: { score: number; factors: HealthFactor[] }) {
  const tone = healthTone(score)
  const R = 30
  const C = 2 * Math.PI * R

  return (
    <GlassPanel className="col-span-2">
      <div className="flex items-center gap-4">
        <div className="relative size-[72px] shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgb(128 128 128 / 0.25)" strokeWidth="8" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={toneVar[tone]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * score) / 100 }}
              transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedNumber value={score} className="text-2xl font-black leading-none" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">מצב הרכב</p>
          <p className="text-lg font-black">{healthLabel(score)}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {factors.map((f, i) => {
          const t = map[f.status]
          return (
            <div key={f.key} className="flex items-center gap-3">
              <span className="w-11 shrink-0 text-xs font-bold text-ink-2">{f.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <motion.span
                  className="absolute inset-y-0 start-0 rounded-full"
                  style={{ backgroundColor: toneVar[t] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${fillFor[f.status] * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.15 + i * 0.08 }}
                />
              </span>
              <span
                className={cn(
                  'w-20 shrink-0 text-end text-[11px] font-bold',
                  t === 'ok' && 'text-ink-2',
                  t === 'warn' && 'text-warn',
                  t === 'danger' && 'text-danger',
                )}
              >
                {f.status === 'missing'
                  ? 'לא הוזן'
                  : f.daysLeft != null && f.daysLeft < 0
                    ? 'פג'
                    : f.date
                      ? formatDate(f.date)
                      : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
