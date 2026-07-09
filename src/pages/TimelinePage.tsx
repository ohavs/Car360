import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { IconCar, IconFile, IconShield, IconWrench } from '../components/icons'
import { EmptyState, ListSkeleton, listItem, listStagger } from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { carDisplayName } from '../lib/reminders'
import { collectCarEvents, type EventKind, type TimelineEvent } from '../lib/timeline'
import { cn, formatDate, formatMoney } from '../lib/utils'

const KIND_META: Record<EventKind, { icon: typeof IconWrench; tone: string }> = {
  service: { icon: IconWrench, tone: 'bg-warn-soft text-warn' },
  insurance: { icon: IconShield, tone: 'bg-ok-soft text-ok' },
  document: { icon: IconFile, tone: 'bg-card-2 text-ink-2' },
  created: { icon: IconCar, tone: 'bg-cta-soft text-cta' },
}

export default function TimelinePage() {
  const { id: carId } = useParams()
  const { cars } = useCars()
  const car = cars.find((c) => c.id === carId)
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)

  useEffect(() => {
    if (!car) return
    let cancelled = false
    void collectCarEvents(car).then((e) => !cancelled && setEvents(e))
    return () => {
      cancelled = true
    }
  }, [car])

  return (
    <div className="px-4">
      <PageHeader title="ציר זמן" subtitle={car ? carDisplayName(car) : undefined} />

      {events === null ? (
        <ListSkeleton />
      ) : events.length <= 1 ? (
        <EmptyState
          icon={<IconWrench size={26} />}
          title="ההיסטוריה תתחיל להיבנות"
          subtitle="ברגע שתוסיפו טיפולים, ביטוחים ומסמכים — הם יופיעו כאן על ציר הזמן"
        />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="relative pb-8 pt-1">
          {/* vertical spine (RTL: sits on the right) */}
          <span className="absolute bottom-4 end-[22px] top-2 w-0.5 rounded-full bg-line" />
          <div className="space-y-3">
            {events.map((ev) => {
              const meta = KIND_META[ev.kind]
              return (
                <motion.div key={ev.id} variants={listItem} className="flex items-stretch gap-3">
                  <div className="relative flex w-11 shrink-0 justify-center">
                    <span
                      className={cn(
                        'z-10 flex size-11 items-center justify-center rounded-full ring-4 ring-canvas',
                        meta.tone,
                      )}
                    >
                      <meta.icon size={20} />
                    </span>
                  </div>
                  <div className="flex-1 rounded-card bg-card p-3.5 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold">{ev.title}</p>
                      {ev.amount != null && (
                        <span className="shrink-0 text-sm font-black">{formatMoney(ev.amount)}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {formatDate(ev.date)}
                      {ev.subtitle ? ` · ${ev.subtitle}` : ''}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
