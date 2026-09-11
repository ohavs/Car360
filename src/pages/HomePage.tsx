import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CarCarousel from '../components/cars/CarCarousel'
import GlassPanel from '../components/cockpit/GlassPanel'
import StatusTile from '../components/cockpit/StatusTile'
import {
  IconBell,
  IconCalendar,
  IconCar,
  IconEdit,
  IconLifeBuoy,
  IconLink,
  IconPhone,
  IconPlus,
  IconSearch,
  IconShare,
  IconShield,
  IconWrench,
} from '../components/icons'
import { Badge, EmptyState, HomeSkeleton, spring } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useSearch } from '../contexts/SearchContext'
import { list, peek } from '../data/store'
import { carHealth } from '../lib/health'
import { useHomeLayout } from '../lib/homeLayout'
import { carDisplayName, collectReminders, notifyUpcoming } from '../lib/reminders'
import { cn, dueLabel, dueStatus, formatDate, formatPlate } from '../lib/utils'
import type { DerivedReminder, InfoBlock } from '../types'

const statusTone = { none: 'neutral', ok: 'ok', warn: 'warn', danger: 'danger' } as const

function blockIcon(block: InfoBlock) {
  switch (block.type) {
    case 'date':
      return <IconCalendar size={16} />
    case 'phone':
      return <IconPhone size={16} />
    case 'link':
      return <IconLink size={16} />
    default:
      return <IconCar size={16} />
  }
}

function BlockValue({ block }: { block: InfoBlock }) {
  if (block.type === 'date') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-black">{formatDate(block.value)}</span>
        {block.value && <Badge tone={statusTone[dueStatus(block.value)]}>{dueLabel(block.value)}</Badge>}
      </div>
    )
  }
  if (block.type === 'phone') {
    return (
      <a href={`tel:${block.value}`} dir="ltr" className="text-lg font-black underline-offset-4 hover:underline">
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
  return <span className="whitespace-pre-wrap text-lg font-black">{block.value || '—'}</span>
}

/** One compact row in the spec sheet. LTR values (e.g. VIN) render smaller so
 *  they always fit on a single line. */
function SpecRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="shrink-0 text-base font-bold text-ink-3">{label}</dt>
      <dd
        className={cn(
          'min-w-0 truncate font-black',
          ltr ? 'text-sm tracking-wide tabular-nums' : 'text-lg',
        )}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </dd>
    </div>
  )
}

/** Small labelled cockpit tile. */
function InfoTile({
  label,
  icon,
  children,
  span,
}: {
  label: string
  icon?: ReactNode
  children: ReactNode
  span?: boolean
}) {
  return (
    <GlassPanel className={cn('!p-3.5', span && 'col-span-2')}>
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        {icon}
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </GlassPanel>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const { cars, loading, activeCar, activeCarId, setActiveCarId } = useCars()
  const { open: openSearch } = useSearch()
  const navigate = useNavigate()
  const [reminders, setReminders] = useState<DerivedReminder[]>([])
  const [servicesCount, setServicesCount] = useState<number | null>(null)
  const [lastService, setLastService] = useState<string | undefined>(undefined)
  const layout = useHomeLayout()

  // parallax: as the page scrolls, the car drifts up slower and fades, so the
  // content panel rises up over it.
  const { scrollY } = useScroll()
  const carY = useTransform(scrollY, [0, 360], [0, 150])
  const carFade = useTransform(scrollY, [0, 230, 360], [1, 1, 0])

  const stack = layout === 'stack'
  const dense = layout === 'compact'
  // stack uses flex-col (not grid-cols-1) so the many `col-span-2` children
  // don't force an implicit second column — everything becomes one true column.
  const gridClass = stack
    ? 'flex flex-col gap-4'
    : dense
      ? 'grid grid-cols-2 gap-2'
      : 'grid grid-cols-2 gap-3'
  const tilePad = stack ? '!p-5' : dense ? '!p-3' : '!p-4'
  const metricClass = stack ? 'text-3xl' : dense ? 'text-lg' : 'text-2xl'
  const svcMetricClass = stack ? 'text-4xl' : dense ? 'text-xl' : 'text-3xl'

  useEffect(() => {
    if (cars.length === 0) return
    let cancelled = false
    void collectReminders(cars).then((r) => !cancelled && setReminders(r))
    void notifyUpcoming(cars)
    return () => {
      cancelled = true
    }
  }, [cars])

  useEffect(() => {
    let cancelled = false
    if (!activeCarId) {
      setServicesCount(null)
      return
    }
    // paint from cache first, then refresh
    const cached = peek('services', activeCarId)
    if (cached) {
      setServicesCount(cached.length)
      setLastService([...cached].sort((a, b) => b.date.localeCompare(a.date))[0]?.date)
    }
    void list('services', activeCarId, { force: true }).then((rows) => {
      if (cancelled) return
      setServicesCount(rows.length)
      setLastService([...rows].sort((a, b) => b.date.localeCompare(a.date))[0]?.date)
    })
    return () => {
      cancelled = true
    }
  }, [activeCarId])

  const carReminders = useMemo(
    () => reminders.filter((r) => r.carId === activeCarId),
    [reminders, activeCarId],
  )
  const urgent = useMemo(() => carReminders.filter((r) => r.daysLeft <= 30), [carReminders])
  const health = useMemo(
    () => (activeCar ? carHealth(activeCar, carReminders) : null),
    [activeCar, carReminders],
  )

  if (loading) return <HomeSkeleton />

  return (
    <div className="px-4 pt-safe">
      {/* top bar */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between py-3"
      >
        <motion.button
          onClick={openSearch ?? undefined}
          whileTap={{ scale: 0.85 }}
          transition={spring}
          aria-label="חיפוש מהיר"
          className="glass-bar flex size-11 items-center justify-center rounded-full text-ink"
        >
          <IconSearch size={20} />
        </motion.button>

        <div className="text-center">
          <h1 className="text-lg font-black leading-tight">
            {activeCar ? carDisplayName(activeCar) : 'Car360'}
          </h1>
          {activeCar && (
            <p className="text-xs font-medium text-ink-3" dir="ltr">
              {formatPlate(activeCar.plate)}
            </p>
          )}
        </div>

        <Link
          to="/settings"
          aria-label="פרופיל והגדרות"
          className="glass-bar block size-11 overflow-hidden rounded-full"
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
          <motion.div style={{ y: carY, opacity: carFade }} className="relative z-0 -mx-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: 0.05 }}>
              <CarCarousel
                cars={cars}
                activeId={activeCarId}
                onChange={setActiveCarId}
                onImageClick={(id) => navigate(`/car/${id}/edit`)}
              />
            </motion.div>
          </motion.div>

          {activeCar && (
            <motion.div
              key={`${activeCar.id}-${layout}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
              className={cn('relative z-10 mt-3 pb-4', gridClass)}
            >
              {/* hero status */}
              {health && <StatusTile score={health.score} factors={health.factors} />}

              {/* test + services */}
              <GlassPanel className={tilePad}>
                <Link to={`/car/${activeCar.id}/edit`} className="block">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-3">
                    <IconCalendar size={17} /> טסט
                  </p>
                  <p className={cn('mt-1.5 font-black tracking-tight', metricClass)}>{formatDate(activeCar.testExpiry)}</p>
                  {activeCar.testExpiry && (
                    <Badge className="mt-1.5" tone={statusTone[dueStatus(activeCar.testExpiry)]}>
                      {dueLabel(activeCar.testExpiry)}
                    </Badge>
                  )}
                </Link>
              </GlassPanel>

              <GlassPanel className={tilePad}>
                <Link to={`/car/${activeCar.id}/services`} className="block">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-3">
                    <IconWrench size={17} /> טיפולים
                  </p>
                  <p className={cn('mt-1.5 font-black tracking-tight', svcMetricClass)}>{servicesCount ?? 0}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-3">
                    {lastService ? `אחרון: ${formatDate(lastService)}` : 'אין טיפולים מתועדים'}
                  </p>
                </Link>
              </GlassPanel>

              {/* quick actions */}
              <GlassPanel className="col-span-2 !p-3">
                <div className="no-scrollbar flex justify-between gap-1 overflow-x-auto">
                  {[
                    { label: 'טיפולים', icon: IconWrench, to: `/car/${activeCar.id}/services` },
                    { label: 'ביטוחים', icon: IconShield, to: `/car/${activeCar.id}/insurance` },
                    { label: 'דוח רכב', icon: IconSearch, to: `/report?plate=${activeCar.plate.replace(/\D/g, '')}` },
                    { label: 'תא כפפות', icon: IconLifeBuoy, to: `/car/${activeCar.id}/glovebox` },
                    { label: 'שיתוף', icon: IconShare, to: `/car/${activeCar.id}/share` },
                    { label: 'עריכה', icon: IconEdit, to: `/car/${activeCar.id}/edit` },
                  ].map((a) => (
                    <motion.div key={a.label} whileTap={{ scale: 0.9 }} transition={spring} className="shrink-0">
                      <Link to={a.to} className={cn('flex flex-col items-center gap-1', dense ? 'w-12' : 'w-14')}>
                        <span
                          className={cn(
                            'flex items-center justify-center rounded-2xl bg-white/50 text-ink ring-1 ring-white/50 dark:bg-white/10 dark:ring-white/10',
                            dense ? 'size-10' : 'size-11',
                          )}
                        >
                          <a.icon size={dense ? 18 : 19} />
                        </span>
                        {!dense && <span className="text-[10px] font-bold text-ink-2">{a.label}</span>}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </GlassPanel>

              {/* urgent reminders */}
              {urgent.length > 0 && (
                <Link to="/reminders" className="col-span-2 block">
                  <GlassPanel
                    className="!p-3.5"
                    style={{ background: urgent[0].daysLeft <= 7 ? 'rgb(239 68 68 / 0.16)' : 'rgb(245 158 11 / 0.16)' }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.span
                        animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                        transition={{ duration: 0.8, delay: 0.8, repeat: 2, repeatDelay: 4 }}
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-white/10',
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
                    </div>
                  </GlassPanel>
                </Link>
              )}

              {/* section header */}
              <div className="col-span-2 flex items-center justify-between pt-1">
                <h2 className={cn('font-black', dense ? 'text-xl' : 'text-2xl')}>פרטי הרכב</h2>
                <Link
                  to={`/car/${activeCar.id}/edit#blocks`}
                  className="glass-bar flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-bold text-ink-2"
                >
                  <IconPlus size={16} />
                  בלוק מידע
                </Link>
              </div>

              {/* spec sheet (with the licence plate) */}
              <GlassPanel className="col-span-2 !p-0">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <dt className="shrink-0 text-base font-bold text-ink-3">לוחית רישוי</dt>
                  <p
                    className="whitespace-nowrap rounded-lg bg-amber-300/90 px-3.5 py-1.5 text-center text-xl font-black tracking-[0.18em] text-black ring-1 ring-black/10"
                    dir="ltr"
                  >
                    {formatPlate(activeCar.plate)}
                  </p>
                </div>
                <dl className="divide-y divide-white/10 dark:divide-white/5 border-t border-white/10 dark:border-white/5">
                  {activeCar.year != null && <SpecRow label="שנת ייצור" value={String(activeCar.year)} />}
                  {activeCar.color && <SpecRow label="צבע" value={activeCar.color} />}
                  {activeCar.fuelType && <SpecRow label="סוג דלק" value={activeCar.fuelType} />}
                  {activeCar.vin && <SpecRow label="מספר שלדה" value={activeCar.vin} ltr />}
                </dl>
              </GlassPanel>
              {activeCar.blocks.map((block) => (
                <InfoTile
                  key={block.id}
                  label={block.title}
                  icon={blockIcon(block)}
                  span={block.type === 'text' && block.value.length > 40}
                >
                  <BlockValue block={block} />
                </InfoTile>
              ))}
              {activeCar.notes && (
                <InfoTile label="הערות" span>
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{activeCar.notes}</p>
                </InfoTile>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
