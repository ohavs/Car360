import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import {
  IconBell,
  IconDownload,
  IconInstall,
  IconLogout,
  IconMoon,
  IconShield,
} from '../components/icons'
import { Card, ConfirmDialog, Switch } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import {
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/reminders'

/** Captured install prompt for the "Install app" action (Chrome/Android). */
let deferredInstallPrompt: (Event & { prompt: () => Promise<void> }) | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e as Event & { prompt: () => Promise<void> }
})

export default function SettingsPage() {
  const { user, signOut, isCloud } = useAuth()
  const { theme, toggle } = useTheme()
  const { toast } = useToast()
  const { cars } = useCars()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [notifGranted, setNotifGranted] = useState(
    () => notificationsSupported() && Notification.permission === 'granted',
  )
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  const toggleNotifications = async (v: boolean) => {
    if (!v) {
      toast('כיבוי התראות מתבצע דרך הגדרות הדפדפן', 'info')
      return
    }
    const ok = await requestNotificationPermission()
    setNotifGranted(ok)
    toast(ok ? 'התראות הופעלו' : 'ההרשאה נדחתה בדפדפן', ok ? 'success' : 'error')
  }

  const install = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt()
      deferredInstallPrompt = null
    } else {
      toast('בספארי: שיתוף ← הוספה למסך הבית. בכרום: תפריט ← התקנת אפליקציה', 'info')
    }
  }

  const exportData = async () => {
    if (!user) return
    const json = await repo.exportAll(user)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `car360-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('הגיבוי הורד')
  }

  return (
    <div className="px-4">
      <PageHeader title="הגדרות" />

      <div className="space-y-4 pb-8">
        {/* profile */}
        <Card className="flex items-center gap-4">
          <span className="block size-14 shrink-0 overflow-hidden rounded-full bg-card-2 ring-1 ring-line">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex size-full items-center justify-center text-lg font-bold">
                {(user?.displayName ?? '?').slice(0, 1)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{user?.displayName}</p>
            <p className="truncate text-sm text-ink-3" dir="ltr">
              {user?.email}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              {cars.length} רכבים · {isCloud ? 'מסונכרן בענן' : 'מצב מקומי (דמו)'}
            </p>
          </div>
        </Card>

        {/* appearance & notifications */}
        <Card className="divide-y divide-line !p-0">
          <SettingRow
            icon={<IconMoon size={20} />}
            title="מצב כהה"
            subtitle="החלפה בין עיצוב בהיר לכהה"
          >
            <Switch checked={theme === 'dark'} onChange={toggle} label="מצב כהה" />
          </SettingRow>
          <SettingRow
            icon={<IconBell size={20} />}
            title="התראות"
            subtitle={notificationsSupported() ? 'תזכורת יומית לתאריכים קרובים' : 'לא נתמך בדפדפן זה'}
          >
            <Switch
              checked={notifGranted}
              onChange={(v) => void toggleNotifications(v)}
              label="התראות"
            />
          </SettingRow>
        </Card>

        {/* app actions */}
        <Card className="divide-y divide-line !p-0">
          <button className="w-full" onClick={() => void install()}>
            <SettingRow
              icon={<IconInstall size={20} />}
              title={standalone ? 'האפליקציה מותקנת ✓' : 'התקנת האפליקציה'}
              subtitle="Car360 כאפליקציה במסך הבית — כולל עבודה אופליין"
            />
          </button>
          <button className="w-full" onClick={() => void exportData()}>
            <SettingRow
              icon={<IconDownload size={20} />}
              title="ייצוא גיבוי"
              subtitle="הורדת כל הנתונים כקובץ JSON"
            />
          </button>
        </Card>

        {/* cloud status */}
        <Card className="flex items-start gap-3 !bg-card-2 !shadow-none">
          <IconShield size={20} className="mt-0.5 shrink-0 text-ink-3" />
          <p className="text-xs leading-relaxed text-ink-3">
            {isCloud
              ? 'הנתונים מסונכרנים ל-Firebase ומאובטחים בחשבון Google שלך. שיתוף רכבים פעיל.'
              : 'האפליקציה רצה במצב מקומי — הנתונים נשמרים רק במכשיר הזה. כדי להפעיל כניסת Google אמיתית, סנכרון בין מכשירים ושיתוף רכבים, חברו פרויקט Firebase לפי ההוראות ב-README.'}
          </p>
        </Card>

        {/* sign out */}
        <button
          onClick={() => setConfirmSignOut(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-danger active:scale-[0.98]"
        >
          <IconLogout size={18} />
          התנתקות
        </button>

        <p className="text-center text-xs text-ink-3">Car360 · גרסה 1.0</p>
      </div>

      {confirmSignOut && (
        <ConfirmDialog
          title="להתנתק?"
          message={isCloud ? 'תמיד אפשר להתחבר שוב עם Google.' : 'במצב דמו הנתונים נשארים שמורים במכשיר.'}
          confirmLabel="התנתקות"
          danger={false}
          onConfirm={() => void signOut()}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  )
}

function SettingRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 p-4 text-start">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {subtitle && <span className="block text-xs text-ink-3">{subtitle}</span>}
      </span>
      {children}
    </div>
  )
}
