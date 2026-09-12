import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CarCarousel from '../components/cars/CarCarousel'
import GlassPanel from '../components/cockpit/GlassPanel'
import AttentionStrip from '../components/cockpit/AttentionStrip'
import HomeSection, { HomeLinkRow, SectionRow } from '../components/cockpit/HomeSection'
import QuickAdd from '../components/cockpit/QuickAdd'
import StatStrip from '../components/cockpit/StatStrip'
import SearchOverlay from '../components/SearchOverlay'
import {
  IconAlert,
  IconCalendar,
  IconCar,
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
  /** bumped after a quick add so the cockpit reloads its data */
  const [refreshTick, setRefreshTick] = useState(0)
  const [searching, setSearching] = useState(false)
  /** bumped to reveal the section an action just added a row to */
  const [revealServices, setRevealServices] = useState(0)


  // parallax: as the page scrolls, the car drifts up slower and fades, so the
  // content panel rises up over it.
  const { scrollY } = useScroll()
  const carY = useTransform(scrollY, [0, 360], [0, 150])
  const carFade = useTransform(scrollY, [0, 230, 360], [1, 1, 0])

  // The cockpit is one column: every block below is full width, so a
  // multi-column grid had nothing left to arrange.
  const gridClass = 'flex flex-col gap-3'

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
        <div className="flex items-center gap-2.5">
          <motion.button
            onClick={toggle}
            whileTap={{ scale: 0.85, rotate: 40 }}
            transition={spring}
            aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
            className="glass-bar flex size-11 items-center justify-center rounded-full text-ink"
          >
            {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </motion.button>

          <motion.button
            onClick={() => setSearching(true)}
            whileTap={{ scale: 0.85 }}
            transition={spring}
            aria-label="חיפוש"
            className="glass-bar flex size-11 items-center justify-center rounded-full text-ink"
          >
            <IconSearch size={20} />
          </motion.button>

        </div>

        {/* with a car on screen its name lives below, next to its own details;
            the bar only needs a title when there is nothing to name */}
        {!activeCar && <h1 className="text-lg font-black leading-tight">Car360</h1>}

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

      <AnimatePresence>
        {searching && <SearchOverlay onClose={() => setSearching(false)} />}
      </AnimatePresence>

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
              key={activeCar.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
              className={cn('relative z-10 mt-3 pb-4', gridClass)}
            >
              {/* the car's name, now that it rides with the details it labels
                  instead of squeezing between the bar's controls */}
              <div className="flex items-center gap-2 px-1">
                <h1 className="min-w-0 flex-1 truncate text-2xl font-black leading-tight">
                  {carDisplayName(activeCar)}
                </h1>
                <span
                  dir="ltr"
                  className="shrink-0 rounded-md bg-white/50 px-2 py-0.5 text-xs font-bold tabular-nums text-ink-2 dark:bg-white/10"
                >
                  {formatPlate(activeCar.plate)}
                </span>
              </div>

              {/* key figures as one compact strip */}
              <div>
                <StatStrip
                  stats={[
                    {
                      label: 'טסט',
                      icon: <IconCalendar size={13} />,
                      value: activeCar.testExpiry ? formatDate(activeCar.testExpiry) : '—',
                      meta: activeCar.testExpiry ? dueLabel(activeCar.testExpiry) : 'לא הוזן תאריך',
                      tone: activeCar.testExpiry ? statusTone[dueStatus(activeCar.testExpiry)] : 'neutral',
                      to: `/car/${activeCar.id}/edit`,
                    },
                    {
                      label: 'הוצאות',
                      icon: <IconWrench size={13} />,
                      value: totalSpend > 0 ? formatMoney(totalSpend) : '—',
                      meta: servicesCount ? `ב-${servicesCount} טיפולים` : 'אין טיפולים מתועדים',
                      to: `/car/${activeCar.id}/services`,
                    },
                  ]}
                />
              </div>

              {/* record the common things without leaving home */}
              <div>
                <QuickAdd
                  carId={activeCar.id}
                  onAdded={(kind) => {
                    setRefreshTick((t) => t + 1)
                    if (kind === 'service') setRevealServices((n) => n + 1)
                  }}
                />
              </div>

              {/* one panel, not four floating cards: the detail sections read as a
                  single object and stay out of the way until opened */}
              <div>
                <GlassPanel className="!p-0 overflow-hidden">
                <HomeSection
                  id="services"
                  flat
                  openSignal={revealServices}
                  title="טיפולים אחרונים"
                  icon={<IconWrench size={16} />}
                  count={recentServices.length}
                  seeAllTo={`/car/${activeCar.id}/services`}
                  addTo={`/car/${activeCar.id}/services?add=1`}
                  addLabel="טיפול חדש"
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
                  addTo={`/car/${activeCar.id}/insurance?add=1`}
                  addLabel="פוליסה חדשה"
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
                  addTo={`/car/${activeCar.id}/documents?add=1`}
                  addLabel="העלאת מסמך"
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

                {/* destinations that have no other home on this screen */}
                <HomeLinkRow
                  to={`/car/${activeCar.id}/glovebox`}
                  title="תא כפפות"
                  subtitle="מה לעשות בתאונה, פנצ׳ר וגרירה"
                  icon={<IconLifeBuoy size={16} />}
                />
                <HomeLinkRow
                  to={`/report?plate=${activeCar.plate.replace(/\D/g, '')}`}
                  title="דוח רכב"
                  subtitle="בדיקה מלאה לפי מספר רישוי"
                  icon={<IconSearch size={16} />}
                />
                <HomeLinkRow
                  to={`/car/${activeCar.id}/share`}
                  title="שיתוף"
                  subtitle="שיתוף הרכב ודרכון לקריאה בלבד"
                  icon={<IconShare size={16} />}
                />

                {/* vehicle details: reference data, not a daily answer */}
                <HomeSection
                  id="specs"
                  flat
                  title="פרטי הרכב"
                  icon={<IconCar size={16} />}
                  seeAllTo={`/car/${activeCar.id}/edit`}
                  addTo={`/car/${activeCar.id}/edit#blocks`}
                  addLabel="בלוק מידע"
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
