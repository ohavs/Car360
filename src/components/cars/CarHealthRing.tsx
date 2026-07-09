import { motion } from 'motion/react'
import { IconCheck } from '../icons'
import { cn } from '../../lib/utils'
import { healthLabel, healthTone, type HealthFactor } from '../../lib/health'

const toneColor: Record<'ok' | 'warn' | 'danger', string> = {
  ok: 'var(--color-ok)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
}
const statusDot: Record<HealthFactor['status'], string> = {
  good: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-danger',
  missing: 'bg-ink-3',
}

/** Circular "car care" gauge with an animated arc + a per-factor breakdown. */
export default function CarHealthRing({
  score,
  factors,
}: {
  score: number
  factors: HealthFactor[]
}) {
  const tone = healthTone(score)
  const R = 34
  const C = 2 * Math.PI * R
  const color = toneColor[tone]

  return (
    <div className="flex items-center gap-4 rounded-card bg-card p-4 shadow-card">
      <div className="relative size-[86px] shrink-0">
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
            transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
            className="text-2xl font-black leading-none"
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-bold text-ink-3">מתוך 100</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">מצב הרכב · {healthLabel(score)}</p>
        <div className="mt-2 space-y-1.5">
          {factors.map((f) => (
            <div key={f.key} className="flex items-center gap-2 text-xs">
              <span className={cn('size-2 shrink-0 rounded-full', statusDot[f.status])} />
              <span className="font-semibold text-ink-2">{f.label}</span>
              <span className="text-ink-3">
                {f.status === 'good' ? (
                  <IconCheck size={13} />
                ) : f.status === 'missing' ? (
                  'לא הוזן'
                ) : f.status === 'bad' ? (
                  'פג תוקף'
                ) : (
                  'מתקרב'
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
