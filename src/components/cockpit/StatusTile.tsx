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
const dotBg: Record<HealthFactor['status'], string> = {
  good: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-danger',
  missing: 'bg-ink-3',
}

/** Compact car-care status: a small animated gauge + inline factor chips. */
export default function StatusTile({ score, factors }: { score: number; factors: HealthFactor[] }) {
  const tone = healthTone(score)
  const R = 26
  const C = 2 * Math.PI * R

  return (
    <GlassPanel className="col-span-2 !p-3">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgb(128 128 128 / 0.25)" strokeWidth="9" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={toneVar[tone]}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * score) / 100 }}
              transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedNumber value={score} className="text-base font-black leading-none" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-ink-3">מצב הרכב · {healthLabel(score)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {factors.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-bold text-ink-2 dark:bg-white/10"
              >
                <span className={cn('size-2 rounded-full', dotBg[f.status])} />
                {f.label}
                <span
                  className={cn(
                    'font-black',
                    map[f.status] === 'warn' && 'text-warn',
                    map[f.status] === 'danger' && 'text-danger',
                  )}
                >
                  {f.status === 'missing' ? '—' : f.date ? formatDate(f.date) : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
