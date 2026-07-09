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
import { Badge, Card, EmptyState, Spinner } from '../components/ui'
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
      return <IconCalendar size={18} />
    case 'phone':
      return <IconPhone size={18} />
    case 'link':
      return <IconLink size={18} />
    default:
      return <IconCar size={18} />
  }
}

function BlockValue({ block }: { block: InfoBlock }) {
  if (block.type === 'date') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">{formatDate(block.value)}</span>
        {block.value && (
          <Badge tone={statusTone[dueStatus(block.value)]}>{dueLabel(block.value)}</Badge>
        )}
      </div>
    )
  }
  if (block.type === 'phone') {
    return (
      <a href={`tel:${block.value}`} dir="ltr" className="text-lg font-bold underline-offset-4 hover:underline">
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
        className="block truncate text-base font-bold text-ink underline underline-offset-4"
      >
        {block.value.replace(/^https?:\/\//, '')}
      </a>
    )
  }
  return <span className="whitespace-pre-wrap text-lg font-bold">{block.value || '—'}</span>
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
      <header className="flex items-center justify-between py-4">
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          className="flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line transition-transform active:rotate-45 active:scale-90"
        >
          {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
        </button>

        <div className="text-center">
          <h1 className="text-lg font-bold leading-tight">
            {activeCar ? carDisplayName(activeCar) : 'Car360'}
          </h1>
          {activeCar && (
            <p className="text-xs text-ink-3" dir="ltr">
              {formatPlate(activeCar.plate)}
            </p>
          )}
        </div>

        <Link
          to="/settings"
          aria-label="פרופיל והגדרות"
          className="block size-11 overflow-hidden rounded-full bg-card shadow-card ring-1 ring-line"
        >
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-bold">
              {(user?.displayName ?? '?').slice(0, 1)}
            </span>
          )}
        </Link>
      </header>

      {cars.length === 0 ? (
        <EmptyState
          icon={<IconCar size={28} />}
          title="עדיין אין רכבים"
          subtitle="נתחיל בהוספת הרכב הראשון שלך"
          action={
            <Link
              to="/car/new"
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-ink shadow-card"
            >
              <IconPlus size={20} />
              הוספת רכב
            </Link>
          }
        />
      ) : (
        <>
          <CarCarousel cars={cars} activeId={activeCarId} onChange={setActiveCarId} />

          {activeCar && (
            <div className="mt-5 space-y-4 pb-4">
              {/* quick status row */}
              <div className="grid grid-cols-2 gap-3">
                <Card onClick={() => navigate(`/car/${activeCar.id}/edit`)} className="space-y-1.5">
                  <p className="text-sm text-ink-3">טסט (רישוי שנתי)</p>
                  <p className="text-xl font-bold">{formatDate(activeCar.testExpiry)}</p>
                  {activeCar.testExpiry && (
                    <Badge tone={statusTone[dueStatus(activeCar.testExpiry)]}>
                      {dueLabel(activeCar.testExpiry)}
                    </Badge>
                  )}
                </Card>
                <Card onClick={() => navigate(`/car/${activeCar.id}/insurance`)} className="space-y-1.5">
                  <p className="text-sm text-ink-3">ביטוח</p>
                  <InsuranceStatus reminders={carReminders} />
                </Card>
              </div>

              {/* action buttons row */}
              <div className="flex justify-between px-2">
                {[
                  { label: 'עריכה', icon: IconEdit, to: `/car/${activeCar.id}/edit` },
                  { label: 'טיפולים', icon: IconWrench, to: `/car/${activeCar.id}/services` },
                  { label: 'ביטוחים', icon: IconShield, to: `/car/${activeCar.id}/insurance` },
                  { label: 'שיתוף', icon: IconShare, to: `/car/${activeCar.id}/share` },
                ].map((a) => (
                  <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5">
                    <span className="flex size-14 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line transition-transform active:scale-90">
                      <a.icon size={22} />
                    </span>
                    <span className="text-xs font-medium text-ink-2">{a.label}</span>
                  </Link>
                ))}
              </div>

              {/* upcoming reminders for this car */}
              {urgent.length > 0 && (
                <Card className="!bg-warn-soft">
                  <Link to="/reminders" className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-warn shadow-card">
                      <IconBell size={20} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">
                        {urgent[0].title} — {dueLabel(urgent[0].dueDate)}
                      </span>
                      {urgent.length > 1 && (
                        <span className="block text-xs text-ink-2">
                          ועוד {urgent.length - 1} תזכורות קרובות
                        </span>
                      )}
                    </span>
                  </Link>
                </Card>
              )}

              {/* user info blocks */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="font-bold">פרטי הרכב</h2>
                <Link
                  to={`/car/${activeCar.id}/edit#blocks`}
                  className="flex items-center gap-1 text-sm font-medium text-ink-2"
                >
                  <IconPlus size={16} />
                  בלוק מידע
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="space-y-1.5">
                  <p className="text-sm text-ink-3">לוחית רישוי</p>
                  <p className="rounded-lg bg-warn-soft px-2 py-1 text-center text-lg font-black tracking-wider ring-1 ring-warn/40" dir="ltr">
                    {formatPlate(activeCar.plate)}
                  </p>
                </Card>
                {activeCar.year != null && (
                  <Card className="space-y-1.5">
                    <p className="text-sm text-ink-3">שנת ייצור</p>
                    <p className="text-lg font-bold">{activeCar.year}</p>
                  </Card>
                )}
                {activeCar.color && (
                  <Card className="space-y-1.5">
                    <p className="text-sm text-ink-3">צבע</p>
                    <p className="text-lg font-bold">{activeCar.color}</p>
                  </Card>
                )}
                {activeCar.fuelType && (
                  <Card className="space-y-1.5">
                    <p className="text-sm text-ink-3">סוג דלק</p>
                    <p className="text-lg font-bold">{activeCar.fuelType}</p>
                  </Card>
                )}
                {activeCar.vin && (
                  <Card className="col-span-2 space-y-1.5">
                    <p className="text-sm text-ink-3">מספר שלדה (VIN)</p>
                    <p className="text-base font-bold tracking-wide" dir="ltr">
                      {activeCar.vin}
                    </p>
                  </Card>
                )}
                {activeCar.blocks.map((block) => (
                  <Card
                    key={block.id}
                    className={cn('space-y-1.5', block.type === 'text' && block.value.length > 40 && 'col-span-2')}
                  >
                    <p className="flex items-center gap-1.5 text-sm text-ink-3">
                      <span className="text-ink-3">{blockIcon(block)}</span>
                      {block.title}
                    </p>
                    <BlockValue block={block} />
                  </Card>
                ))}
              </div>

              {activeCar.notes && (
                <Card className="space-y-1.5">
                  <p className="text-sm text-ink-3">הערות</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{activeCar.notes}</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InsuranceStatus({ reminders }: { reminders: DerivedReminder[] }) {
  const ins = reminders.find((r) => r.source === 'insurance')
  if (!ins) {
    return <p className="text-xl font-bold text-ink-3">—</p>
  }
  return (
    <>
      <p className="text-xl font-bold">{formatDate(ins.dueDate)}</p>
      <Badge tone={statusTone[dueStatus(ins.dueDate)]}>{dueLabel(ins.dueDate)}</Badge>
    </>
  )
}
