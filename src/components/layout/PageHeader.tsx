import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CarSilhouette from '../cars/CarSilhouette'
import { useCars } from '../../contexts/CarsContext'
import { useSearch } from '../../contexts/SearchContext'
import { carDisplayName } from '../../lib/reminders'
import { cn, formatPlate } from '../../lib/utils'
import { IconCheck, IconChevronDown, IconChevronRight, IconSearch } from '../icons'
import { BottomSheet, spring } from '../ui'

/** Sticky sub-page header: back chevron (points "forward" in RTL), title,
 *  quick search, optional trailing action. When the screen belongs to a car,
 *  the subtitle becomes a car switcher so you can jump between cars without
 *  going back to the home screen. */
export default function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  carId,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  /** the car this screen belongs to — turns the subtitle into a switcher */
  carId?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { cars, setActiveCarId } = useCars()
  const { open: openSearch } = useSearch()
  const [switching, setSwitching] = useState(false)

  // a deep link (notification, shared URL, PWA launch) has no history to pop
  const back = onBack ?? (() => (location.key === 'default' ? navigate('/') : navigate(-1)))
  const canSwitch = Boolean(carId) && cars.length > 1

  const switchCar = (id: string) => {
    setActiveCarId(id)
    setSwitching(false)
    if (id !== carId) {
      navigate(location.pathname.replace(/^\/car\/[^/]+/, `/car/${id}`) + location.search, {
        replace: true,
      })
    }
  }

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-4 bg-canvas/50 px-4 py-3 pt-safe backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <motion.button
          aria-label="חזרה"
          whileTap={{ scale: 0.85 }}
          transition={spring}
          onClick={back}
          className="glass-bar flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
        >
          <IconChevronRight size={22} />
        </motion.button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black leading-tight">{title}</h1>
          {subtitle &&
            (canSwitch ? (
              <button
                onClick={() => setSwitching(true)}
                className="flex max-w-full items-center gap-1 text-xs font-bold text-cta"
              >
                <span className="truncate">{subtitle}</span>
                <IconChevronDown size={14} className="shrink-0" />
              </button>
            ) : (
              <p className="truncate text-xs font-medium text-ink-3">{subtitle}</p>
            ))}
        </div>

        {openSearch && (
          <motion.button
            aria-label="חיפוש"
            whileTap={{ scale: 0.85 }}
            transition={spring}
            onClick={openSearch}
            className="glass-bar flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
          >
            <IconSearch size={19} />
          </motion.button>
        )}
        {action}
      </div>

      {switching && (
        <BottomSheet title="מעבר לרכב" onClose={() => setSwitching(false)}>
          <div className="space-y-2 pb-2">
            {cars.map((c) => (
              <button
                key={c.id}
                onClick={() => switchCar(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card p-3 text-start ring-1',
                  c.id === carId ? 'bg-cta-soft ring-cta' : 'bg-card ring-line',
                )}
              >
                <span className="flex h-12 w-16 shrink-0 items-center justify-center">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" loading="lazy" className="max-h-12 w-auto object-contain" />
                  ) : (
                    <CarSilhouette className="h-8 w-auto text-ink-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{carDisplayName(c)}</span>
                  <span className="block text-xs text-ink-3" dir="ltr">
                    {formatPlate(c.plate)}
                  </span>
                </span>
                {c.id === carId && <IconCheck size={18} className="shrink-0 text-cta" />}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </header>
  )
}
