import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CarCarousel from '../components/cars/CarCarousel'
import {
  IconBell,
  IconCalendar,
  IconCar,
  IconEdit,
  IconLink,
  IconMoon,
  IconPhone,
  IconPlus,
  IconShare,
  IconShield,
  IconSun,
  IconWrench,
} from '../components/icons'
import { Badge, Card, EmptyState, Spinner, listItem, listStagger, spring } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useTheme } from '../contexts/ThemeContext'
import { carDisplayName, collectReminders, notifyUpcoming } from '../lib/reminders'
import { cn, dueLabel, dueStatus, formatDate, formatPlate } from '../lib/utils'
import type { DerivedReminder, InfoBlock } from '../types'

const statusTone = { none: 'neutral', ok: 'ok', warn: 'warn', danger: 'danger' } as const

function blockIcon(block: InfoBlock) {
  switch (block.type) {
    case 'date':
      return <IconCalendar size={17} />
    case 'phone':
      return <IconPhone size={17} />
    case 'link':
      return <IconLink size={17} />
    default:
      return <IconCar size={17} />
  }
}

function BlockValue({ block }: { block: InfoBlock }) {
  if (block.type === 'date') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-black">{formatDate(block.value)}</span>
        {block.value && <Badge tone={statusTone[dueStatus(block.value)]}>{dueLabel(block.value)}</Badge>}
      </div>
    )
  }
  if (block.type === 'phone') {
    return (
      <a href={`tel:${block.value}`} dir="ltr" className="text-xl font-black underline-offset-4 hover:underline">
        {block.value}
      </a>
    )
  }
  if (block.type === 'link') {
    return (
      <a
        href={block.value}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className="block truncate text-base font-black text-ink underline underline-offset-4"
      >
        {block.value.replace(/^https?:\/\//, '')}
      </a>
    )
  }
  return <span className="whitespace-pre-wrap text-xl font-black">{block.value || '—'}</span>
}

export default function HomePage() {
  const { user } = useAuth()
  const { cars, loading, activeCar, activeCarId, setActiveCarId } = useCars()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [reminders, setReminders] = useState<DerivedReminder[]>([])

  useEffect(() => {
    if (cars.length === 0) return
    let cancelled = false
    void collectReminders(cars).then((r) => {
      if (!cancelled) setReminders(r)
    })
    void notifyUpcoming(cars)
    return () => {
      cancelled = true
    }
  }, [cars])

  const carReminders = useMemo(
    () => reminders.filter((r) => r.carId === activeCarId),
    [reminders, activeCarId],
  )
  const urgent = useMemo(() => carReminders.filter((r) => r.daysLeft <= 30), [carReminders])

  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="px-4 pt-safe">
      {/* top bar */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center justify-between py-4"
      >
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.85, rotate: 40 }}
          transition={spring}
          aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          className="flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div className="text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeCarId ?? 'none'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <h1 className="text-lg font-black leading-tight">
                {activeCar ? carDisplayName(activeCar) : 'Car360'}
              </h1>
              {activeCar && (
                <p className="text-xs font-medium text-ink-3" dir="ltr">
                  {formatPlate(activeCar.plate)}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <Link
          to="/settings"
          aria-label="פרופיל והגדרות"
          className="block size-11 overflow-hidden rounded-full bg-card shadow-card ring-1 ring-line"
        >
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-black">
              {(user?.displayName ?? '?').slice(0, 1)}
            </span>
          )}
        </Link>
      </motion.header>

      {cars.length === 0 ? (
        <EmptyState
          icon={<IconCar size={28} />}
          title="עדיין אין רכבים"
          subtitle="נתחיל בהוספת הרכב הראשון שלך"
          action={
            <motion.div whileTap={{ scale: 0.96 }}>
              <Link
                to="/car/new"
                className="mt-2 inline-flex min-h-13 items-center gap-2 rounded-full bg-cta px-7 font-bold text-white shadow-float"
              >
                <IconPlus size={20} />
                הוספת רכב
              </Link>
            </motion.div>
          }
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: 0.05 }}>
            <CarCarousel cars={cars} activeId={activeCarId} onChange={setActiveCarId} />
          </motion.div>

          {activeCar && (
            <motion.div
              key={activeCar.id}
              variants={listStagger}
              initial="hidden"
              animate="show"
              className="mt-5 space-y-4 pb-4"
            >
              {/* quick status row */}
              <motion.div variants={listItem} className="grid grid-cols-2 gap-3">
                <Card onClick={() => navigate(`/car/${activeCar.id}/edit`)} className="space-y-1.5">
                  <p className="text-[13px] font-semibold text-ink-3">טסט (רישוי שנתי)</p>
                  <p className="text-2xl font-black tracking-tight">{formatDate(activeCar.testExpiry)}</p>
                  {activeCar.testExpiry && (
                    <Badge tone={statusTone[dueStatus(activeCar.testExpiry)]}>{dueLabel(activeCar.testExpiry)}</Badge>
                  )}
                </Card>
                <Card onClick={() => navigate(`/car/${activeCar.id}/insurance`)} className="space-y-1.5">
                  <p className="text-[13px] font-semibold text-ink-3">ביטוח</p>
                  <InsuranceStatus reminders={carReminders} />
                </Card>
              </motion.div>

              {/* action buttons row */}
              <motion.div variants={listItem} className="flex justify-between px-2">
                {[
                  { label: 'עריכה', icon: IconEdit, to: `/car/${activeCar.id}/edit` },
                  { label: 'טיפולים', icon: IconWrench, to: `/car/${activeCar.id}/services` },
                  { label: 'ביטוחים', icon: IconShield, to: `/car/${activeCar.id}/insurance` },
                  { label: 'שיתוף', icon: IconShare, to: `/car/${activeCar.id}/share` },
                ].map((a) => (
                  <motion.div key={a.label} whileTap={{ scale: 0.88 }} transition={spring}>
                    <Link to={a.to} className="flex flex-col items-center gap-1.5">
                      <span className="flex size-14 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line">
                        <a.icon size={22} />
                      </span>
                      <span className="text-xs font-bold text-ink-2">{a.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* upcoming reminders for this car */}
              {urgent.length > 0 && (
                <motion.div variants={listItem}>
                  <Link to="/reminders">
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex items-center gap-3 rounded-card p-4 shadow-card',
                        urgent[0].daysLeft <= 7 ? 'bg-danger-soft' : 'bg-warn-soft',
                      )}
                    >
                      <motion.span
                        animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                        transition={{ duration: 0.8, delay: 1, repeat: 2, repeatDelay: 4 }}
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full bg-card shadow-card',
                          urgent[0].daysLeft <= 7 ? 'text-danger' : 'text-warn',
                        )}
                      >
                        <IconBell size={20} />
                      </motion.span>
                      <span className="flex-1">
                        <span className="block text-sm font-black">
                          {urgent[0].title} — {dueLabel(urgent[0].dueDate)}
                        </span>
                        {urgent.length > 1 && (
                          <span className="block text-xs font-medium text-ink-2">
                            ועוד {urgent.length - 1} תזכורות קרובות
                          </span>
                        )}
                      </span>
                    </motion.div>
                  </Link>
                </motion.div>
              )}

              {/* user info blocks */}
              <motion.div variants={listItem} className="flex items-center justify-between pt-1">
                <h2 className="text-xl font-black">פרטי הרכב</h2>
                <Link
                  to={`/car/${activeCar.id}/edit#blocks`}
                  className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[13px] font-bold text-ink-2 shadow-card"
                >
                  <IconPlus size={15} />
                  בלוק מידע
                </Link>
              </motion.div>

              <motion.div variants={listItem} className="grid grid-cols-2 gap-3">
                <Card className="space-y-1.5">
                  <p className="text-[13px] font-semibold text-ink-3">לוחית רישוי</p>
                  <p
                    className="rounded-xl bg-warn-soft px-2 py-1.5 text-center text-xl font-black tracking-widest ring-1 ring-warn/40"
                    dir="ltr"
                  >
                    {formatPlate(activeCar.plate)}
                  </p>
                </Card>
                {activeCar.year != null && (
                  <Card className="space-y-1.5">
                    <p className="text-[13px] font-semibold text-ink-3">שנת ייצור</p>
                    <p className="text-2xl font-black tracking-tight">{activeCar.year}</p>
                  </Card>
                )}
                {activeCar.color && (
                  <Card className="space-y-1.5">
                    <p className="text-[13px] font-semibold text-ink-3">צבע</p>
                    <p className="text-xl font-black">{activeCar.color}</p>
                  </Card>
                )}
                {activeCar.fuelType && (
                  <Card className="space-y-1.5">
                    <p className="text-[13px] font-semibold text-ink-3">סוג דלק</p>
                    <p className="text-xl font-black">{activeCar.fuelType}</p>
                  </Card>
                )}
                {activeCar.vin && (
                  <Card className="col-span-2 space-y-1.5">
                    <p className="text-[13px] font-semibold text-ink-3">מספר שלדה (VIN)</p>
                    <p className="text-base font-black tracking-wide" dir="ltr">
                      {activeCar.vin}
                    </p>
                  </Card>
                )}
                {activeCar.blocks.map((block) => (
                  <Card
                    key={block.id}
                    className={cn('space-y-1.5', block.type === 'text' && block.value.length > 40 && 'col-span-2')}
                  >
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
                      {blockIcon(block)}
                      {block.title}
                    </p>
                    <BlockValue block={block} />
                  </Card>
                ))}
              </motion.div>

              {activeCar.notes && (
                <motion.div variants={listItem}>
                  <Card className="space-y-1.5">
                    <p className="text-[13px] font-semibold text-ink-3">הערות</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{activeCar.notes}</p>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

function InsuranceStatus({ reminders }: { reminders: DerivedReminder[] }) {
  const ins = reminders.find((r) => r.source === 'insurance')
  if (!ins) {
    return <p className="text-2xl font-black text-ink-3">—</p>
  }
  return (
    <>
      <p className="text-2xl font-black tracking-tight">{formatDate(ins.dueDate)}</p>
      <Badge tone={statusTone[dueStatus(ins.dueDate)]}>{dueLabel(ins.dueDate)}</Badge>
    </>
  )
}
