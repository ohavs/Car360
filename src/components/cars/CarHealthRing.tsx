import { motion } from 'motion/react'
import AnimatedNumber from '../AnimatedNumber'
import { healthLabel, healthTone, type HealthFactor } from '../../lib/health'
import { cn, dueLabel, formatDate } from '../../lib/utils'

const toneVar: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'var(--color-ok)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
}
const statusToneMap: Record<HealthFactor['status'], 'ok' | 'warn' | 'danger'> = {
  good: 'ok',
  warn: 'warn',
  bad: 'danger',
  missing: 'danger',
}
const fillFor: Record<HealthFactor['status'], number> = { good: 1, warn: 0.5, bad: 0.15, missing: 0.04 }

/** Consolidated car-care card: animated gauge (arc + count-up) plus a live
 *  bar per factor. All value animations — nothing slides around. */
export default function CarHealthRing({
  score,
  factors,
}: {
  score: number
  factors: HealthFactor[]
}) {
  const tone = healthTone(score)
  const R = 32
  const C = 2 * Math.PI * R
  const color = toneVar[tone]

  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center gap-4">
        <div className="relative size-[78px] shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--color-card-2)" strokeWidth="8" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={color}
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

      <div className="mt-3 space-y-2.5">
        {factors.map((f, i) => {
          const t = statusToneMap[f.status]
          return (
            <div key={f.key} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs font-bold text-ink-2">{f.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-card-2">
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
                  'w-24 shrink-0 text-end text-[11px] font-bold',
                  t === 'ok' && 'text-ink-2',
                  t === 'warn' && 'text-warn',
                  t === 'danger' && 'text-danger',
                )}
              >
                {f.status === 'missing'
                  ? 'לא הוזן'
                  : f.daysLeft != null && f.daysLeft < 0
                    ? 'פג תוקף'
                    : f.date
                      ? formatDate(f.date)
                      : dueLabel(f.date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
