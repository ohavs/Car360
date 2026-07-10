import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCars } from '../../contexts/CarsContext'
import { cn } from '../../lib/utils'
import {
  IconBell,
  IconCamera,
  IconCar,
  IconFile,
  IconHome,
  IconPlus,
  IconSettings,
  IconShield,
  IconWrench,
} from '../icons'
import { BottomSheet, listItem, listStagger, spring } from '../ui'

const tabs = [
  { to: '/', label: 'בית', icon: IconHome },
  { to: '/reminders', label: 'תזכורות', icon: IconBell },
  { to: null, label: 'הוספה', icon: IconPlus }, // center action
  { to: '/documents', label: 'מסמכים', icon: IconFile },
  { to: '/settings', label: 'הגדרות', icon: IconSettings },
]

export default function AppShell() {
  const [quickAdd, setQuickAdd] = useState(false)
  const { activeCarId } = useCars()
  const navigate = useNavigate()
  const location = useLocation()
  // group routes into "sections" so navigating between top-level tabs animates,
  // but query-only changes (e.g. ?add=1) don't remount the page
  const routeKey = location.pathname

  // active-tab detection that survives redirects (e.g. /documents → /car/:id/documents)
  const isTabActive = (to: string) => {
    const p = location.pathname
    if (to === '/') return p === '/'
    if (to === '/documents') return p === '/documents' || p.endsWith('/documents')
    return p.startsWith(to)
  }

  const go = (path: string) => {
    setQuickAdd(false)
    navigate(path)
  }

  const quickActions = [
    { label: 'רכב חדש', desc: 'הוספת רכב לאוסף שלך', icon: IconCar, action: () => go('/car/new') },
    ...(activeCarId
      ? [
          { label: 'טיפול / תיקון', desc: 'תיעוד טיפול לרכב הפעיל', icon: IconWrench, action: () => go(`/car/${activeCarId}/services?add=1`) },
          { label: 'ביטוח', desc: 'הוספת פוליסת ביטוח', icon: IconShield, action: () => go(`/car/${activeCarId}/insurance?add=1`) },
          { label: 'מסמך / תמונה', desc: 'צילום או העלאת מסמך', icon: IconCamera, action: () => go(`/car/${activeCarId}/documents?add=1`) },
        ]
      : []),
  ]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 pb-36">
        <motion.div
          key={routeKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 0.9, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full max-w-md px-4 pb-6 pb-safe [&>*]:pointer-events-auto">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
            className="nav-bar glass-bar flex items-center justify-between rounded-[2rem] px-3 py-2"
          >
            {tabs.map((tab) =>
              tab.to === null ? (
                <motion.button
                  key="add"
                  aria-label="הוספה מהירה"
                  onClick={() => setQuickAdd(true)}
                  whileTap={{ scale: 0.85 }}
                  transition={spring}
                  className="flex size-15 -translate-y-5 items-center justify-center rounded-full bg-cta text-white shadow-float"
                >
                  <motion.span animate={{ rotate: quickAdd ? 135 : 0 }} transition={spring}>
                    <IconPlus size={28} />
                  </motion.span>
                </motion.button>
              ) : (
                (() => {
                  const active = isTabActive(tab.to)
                  return (
                    <button
                      key={tab.to}
                      onClick={() => navigate(tab.to!)}
                      aria-current={active ? 'page' : undefined}
                      aria-label={tab.label}
                      className="flex min-w-14 flex-col items-center gap-1 py-1 outline-none"
                    >
                      <span className="relative flex size-9 items-center justify-center">
                        {active && (
                          <motion.span
                            layoutId="nav-pill"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            className="nav-pill absolute inset-0 rounded-[14px] bg-cta-soft"
                          />
                        )}
                        <tab.icon
                          size={22}
                          strokeWidth={active ? 2.4 : 1.8}
                          className={cn('relative transition-colors', active ? 'text-cta' : 'text-ink-3')}
                        />
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-bold transition-colors',
                          active ? 'text-cta' : 'text-ink-3',
                        )}
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })()
              ),
            )}
          </motion.div>
        </div>
      </nav>

      <AnimatePresence>
        {quickAdd && (
          <BottomSheet title="מה מוסיפים?" onClose={() => setQuickAdd(false)}>
            <motion.div variants={listStagger} initial="hidden" animate="show" className="grid gap-3">
              {quickActions.map((a) => (
                <motion.button
                  key={a.label}
                  variants={listItem}
                  whileTap={{ scale: 0.97 }}
                  onClick={a.action}
                  className="flex items-center gap-4 rounded-card bg-card p-4 text-start shadow-card"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink">
                    <a.icon size={22} />
                  </span>
                  <span>
                    <span className="block font-bold">{a.label}</span>
                    <span className="block text-sm text-ink-3">{a.desc}</span>
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  )
}
