import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import GlassPanel from './GlassPanel'
import { IconAlert, IconCheck, IconChevronLeft } from '../icons'
import { cn, dueLabel } from '../../lib/utils'
import type { DerivedReminder } from '../../types'

/** Where a reminder is resolved, so one tap lands on the right screen. */
function routeFor(r: DerivedReminder): string {
  switch (r.source) {
    case 'insurance':
      return `/car/${r.carId}/insurance`
    case 'service':
      return `/car/${r.carId}/services`
    case 'custom':
      return '/reminders'
    default:
      return `/car/${r.carId}/edit`
  }
}

/** The first thing on the home screen: everything that needs action, most
 *  urgent first. Collapses to a single quiet line when nothing is due, so it
 *  never costs space it hasn't earned. */
export default function AttentionStrip({
  reminders,
  max = 3,
}: {
  reminders: DerivedReminder[]
  max?: number
}) {
  const due = reminders.filter((r) => r.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft)

  if (due.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-ok-soft px-4 py-2 text-ok">
        <IconCheck size={16} />
        <span className="text-sm font-bold">הכל מסודר — אין מה שדורש טיפול</span>
      </div>
    )
  }

  const shown = due.slice(0, max)
  const rest = due.length - shown.length
  const worst = shown[0].daysLeft

  return (
    <GlassPanel
      className="!p-0 overflow-hidden"
      style={{ background: worst <= 7 ? 'rgb(239 68 68 / 0.14)' : 'rgb(245 158 11 / 0.14)' }}
    >
      <div className="flex items-center gap-2 px-4 pb-1.5 pt-3">
        <span className={cn('flex size-6 items-center justify-center', worst <= 7 ? 'text-danger' : 'text-warn')}>
          <IconAlert size={17} />
        </span>
        <h2 className="text-sm font-black">דורש טיפול</h2>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold text-ink-2 dark:bg-white/10">
          {due.length}
        </span>
      </div>

      <ul className="divide-y divide-white/25 dark:divide-white/8">
        {shown.map((r, i) => (
          <motion.li
            key={r.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <Link to={routeFor(r)} className="flex items-center gap-3 px-4 py-2.5 active:opacity-70">
              <span
                className={cn(
                  'h-8 w-1 shrink-0 rounded-full',
                  r.daysLeft < 0 ? 'bg-danger' : r.daysLeft <= 7 ? 'bg-danger/70' : 'bg-warn',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{r.title}</span>
                <span className="block truncate text-xs font-semibold text-ink-2">
                  {r.carName} · {dueLabel(r.dueDate)}
                </span>
              </span>
              <IconChevronLeft size={18} className="shrink-0 text-ink-3" />
            </Link>
          </motion.li>
        ))}
      </ul>

      {rest > 0 && (
        <Link
          to="/reminders"
          className="block border-t border-white/25 px-4 py-2.5 text-center text-xs font-bold text-ink-2 active:opacity-70 dark:border-white/8"
        >
          ועוד {rest} — לכל התזכורות
        </Link>
      )}
    </GlassPanel>
  )
}
