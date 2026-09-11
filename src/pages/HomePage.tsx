import { motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CarCarousel from '../components/cars/CarCarousel'
import GlassPanel from '../components/cockpit/GlassPanel'
import AttentionStrip from '../components/cockpit/AttentionStrip'
import HomeSection, { SectionRow } from '../components/cockpit/HomeSection'
import QuickAdd from '../components/cockpit/QuickAdd'
import {
  IconAlert,
  IconCalendar,
  IconCar,
  IconEdit,
  IconFile,
  IconLifeBuoy,
  IconLink,
  IconMoon,
  IconPhone,
  IconPlus,
  IconSearch,
  IconShare,
  IconShield,
  IconSun,
  IconWrench,
} from '../components/icons'
import { Badge, EmptyState, HomeSkeleton, spring } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useTheme } from '../contexts/ThemeContext'
import { repo } from '../data'
import { carDisplayName, collectReminders, notifyUpcoming } from '../lib/reminders'
import { readLayout, type LayoutId } from '../lib/homeLayout'
import { cn, dueLabel, dueStatus, formatDate, formatMoney, formatPlate } from '../lib/utils'
import type {
  CarDocument,
  DerivedReminder,
  InfoBlock,
  InsuranceRecord,
  ServiceRecord,
} from '../types'

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
  const { cars, loading, activeCar, activeCarId, setActiveCarId, error, refresh } = useCars()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [reminders, setReminders] = useState<DerivedReminder[]>([])
  const [overview, setOverview] = useState<{
    services: ServiceRecord[]
    insurances: InsuranceRecord[]
    documents: CarDocument[]
  } | null>(null)
  const [layout] = useState<LayoutId>(readLayout)
  /** bumped after a quick add so the cockpit reloads its data */
  const [refreshTick, setRefreshTick] = useState(0)


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
  }, [cars, refreshTick])

  // one parallel wave for the active car — powers the counters and every
  // inline section below, so the cockpit costs a single round trip
  useEffect(() => {
    let cancelled = false
    if (!activeCarId) {
      setOverview(null)
      return
    }
    void Promise.all([
      repo.listServices(activeCarId),
      repo.listInsurances(activeCarId),
      repo.listDocuments(activeCarId),
    ]).then(([services, insurances, documents]) => {
      if (!cancelled) setOverview({ services, insurances, documents })
    })
    return () => {
      cancelled = true
    }
  }, [activeCarId, refreshTick])

  const recentServices = useMemo(
    () => [...(overview?.services ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [overview],
  )
  const activeInsurances = useMemo(
    () => [...(overview?.insurances ?? [])].sort((a, b) => b.endDate.localeCompare(a.endDate)),
    [overview],
  )
  const recentDocs = useMemo(
    () => [...(overview?.documents ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [overview],
  )
  const servicesCount = overview?.services.length ?? null
  const totalSpend = useMemo(
    () => recentServices.reduce((sum, sv) => sum + (sv.cost ?? 0), 0),
    [recentServices],
  )

  const carReminders = useMemo(
    () => reminders.filter((r) => r.carId === activeCarId),
    [reminders, activeCarId],
  )

  if (loading) return <HomeSkeleton />

  // a failed load must never look like an empty or frozen app
  if (error && cars.length === 0) {
    return (
      <div className="px-4 pt-safe">
        <EmptyState
          icon={<IconAlert size={26} />}
          title="לא הצלחנו לטעון את הרכבים"
          subtitle="בדקו את החיבור לאינטרנט ונסו שוב."
          action={
            <button
              onClick={() => void refresh()}
              className="min-h-12 rounded-full bg-cta px-6 font-bold text-white active:scale-95"
            >
              נסו שוב
            </button>
          }
        />
      </div>
    )
  }

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
          onClick={toggle}
          whileTap={{ scale: 0.85, rotate: 40 }}
          transition={spring}
          aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          className="glass-bar flex size-11 items-center justify-center rounded-full text-ink"
        >
          {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
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
          {/* the first thing on the screen: what needs action */}
          <div className="relative z-10 mb-3">
            <AttentionStrip reminders={carReminders} />
          </div>

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

              {/* total spend — the services list itself lives inline below, so
                  this tile carries information that isn't repeated anywhere */}
              <GlassPanel className={tilePad}>
                <Link to={`/car/${activeCar.id}/services`} className="block">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-3">
                    <IconWrench size={17} /> הוצאות
                  </p>
                  <p className={cn('mt-1.5 font-black tracking-tight', svcMetricClass)}>
                    {totalSpend > 0 ? formatMoney(totalSpend) : '—'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-3">
                    {servicesCount ? `ב-${servicesCount} טיפולים` : 'אין טיפולים מתועדים'}
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

              {/* record the common things without leaving home */}
              <div className="col-span-2">
                <QuickAdd carId={activeCar.id} onAdded={() => setRefreshTick((t) => t + 1)} />
              </div>

              {/* one panel, not four floating cards: the detail sections read as a
                  single object and stay out of the way until opened */}
              <div className="col-span-2">
                <GlassPanel className="!p-0 overflow-hidden">
                <HomeSection
                  id="services"
                  flat
                  title="טיפולים אחרונים"
                  icon={<IconWrench size={16} />}
                  count={recentServices.length}
                  seeAllTo={`/car/${activeCar.id}/services`}
                  defaultOpen={false}
                  empty="עדיין לא תועדו טיפולים"
                >
                  {recentServices.slice(0, 3).map((sv) => (
                    <SectionRow
                      key={sv.id}
                      to={`/car/${activeCar.id}/services`}
                      title={sv.title}
                      subtitle={`${formatDate(sv.date)}${sv.garage ? ` · ${sv.garage}` : ''}`}
                      trailing={
                        sv.cost != null ? (
                          <span className="shrink-0 text-sm font-black">{formatMoney(sv.cost)}</span>
                        ) : undefined
                      }
                    />
                  ))}
                </HomeSection>

                <HomeSection
                  id="insurance"
                  flat
                  title="ביטוח"
                  icon={<IconShield size={16} />}
                  count={activeInsurances.length}
                  seeAllTo={`/car/${activeCar.id}/insurance`}
                  defaultOpen={false}
                  empty="לא נוספו פוליסות"
                >
                  {activeInsurances.slice(0, 2).map((ins) => (
                    <SectionRow
                      key={ins.id}
                      to={`/car/${activeCar.id}/insurance`}
                      title={`${ins.kind} · ${ins.company}`}
                      subtitle={`בתוקף עד ${formatDate(ins.endDate)}`}
                      trailing={
                        <Badge tone={statusTone[dueStatus(ins.endDate)]}>{dueLabel(ins.endDate)}</Badge>
                      }
                    />
                  ))}
                </HomeSection>

                <HomeSection
                  id="documents"
                  flat
                  title="מסמכים"
                  icon={<IconFile size={16} />}
                  count={recentDocs.length}
                  seeAllTo={`/car/${activeCar.id}/documents`}
                  defaultOpen={false}
                  empty="לא הועלו מסמכים"
                >
                  <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
                    {recentDocs.slice(0, 8).map((d) => (
                      <Link
                        key={d.id}
                        to={`/car/${activeCar.id}/documents`}
                        className="shrink-0 active:scale-95"
                        aria-label={d.title}
                      >
                        <img
                          src={d.imageUrl}
                          alt=""
                          loading="lazy"
                          className="size-16 rounded-xl object-cover ring-1 ring-line"
                        />
                      </Link>
                    ))}
                  </div>
                </HomeSection>

                {/* vehicle details: reference data, not a daily answer */}
                <HomeSection
                  id="specs"
                  flat
                  title="פרטי הרכב"
                  icon={<IconCar size={16} />}
                  seeAllTo={`/car/${activeCar.id}/edit`}
                  defaultOpen={false}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <dt className="shrink-0 text-base font-bold text-ink-3">לוחית רישוי</dt>
                    <p
                      className="whitespace-nowrap rounded-lg bg-amber-300/90 px-3.5 py-1.5 text-center text-xl font-black tracking-[0.18em] text-black ring-1 ring-black/10"
                      dir="ltr"
                    >
                      {formatPlate(activeCar.plate)}
                    </p>
                  </div>
                  <dl className="divide-y divide-white/10 border-t border-white/10 dark:divide-white/5 dark:border-white/5">
                    {activeCar.year != null && <SpecRow label="שנת ייצור" value={String(activeCar.year)} />}
                    {activeCar.color && <SpecRow label="צבע" value={activeCar.color} />}
                    {activeCar.fuelType && <SpecRow label="סוג דלק" value={activeCar.fuelType} />}
                    {activeCar.vin && <SpecRow label="מספר שלדה" value={activeCar.vin} ltr />}
                  </dl>
                </HomeSection>
                </GlassPanel>
              </div>
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
