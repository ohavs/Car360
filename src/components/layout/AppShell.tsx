import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCars } from '../../contexts/CarsContext'
import { cn } from '../../lib/utils'
import { IconBell, IconFile, IconHome, IconPlus, IconSettings, IconWrench, IconShield, IconCar, IconCamera } from '../icons'
import { BottomSheet } from '../ui'

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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full max-w-lg px-4 pb-3 pb-safe">
          <div className="flex items-center justify-between rounded-[1.75rem] bg-card px-3 py-2 shadow-float ring-1 ring-line">
            {tabs.map((tab) =>
              tab.to === null ? (
                <button
                  key="add"
                  aria-label="הוספה מהירה"
                  onClick={() => setQuickAdd(true)}
                  className="flex size-14 -translate-y-4 items-center justify-center rounded-full bg-accent text-accent-ink shadow-float transition-transform active:scale-90"
                >
                  <IconPlus size={26} />
                </button>
              ) : (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors',
                      isActive ? 'text-ink' : 'text-ink-3',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span>{tab.label}</span>
                    </>
                  )}
                </NavLink>
              ),
            )}
          </div>
        </div>
      </nav>

      {quickAdd && (
        <BottomSheet title="מה מוסיפים?" onClose={() => setQuickAdd(false)}>
          <div className="grid gap-3">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className="flex items-center gap-4 rounded-card bg-card p-4 text-start shadow-card transition-transform active:scale-[0.98]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink">
                  <a.icon size={22} />
                </span>
                <span>
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block text-sm text-ink-3">{a.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
