import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import {
  IconBell,
  IconChevronLeft,
  IconDownload,
  IconInstall,
  IconLogout,
  IconMoon,
  IconShield,
  IconSparkles,
} from '../components/icons'
import { Card, ConfirmDialog, Switch } from '../components/ui'
import { Select } from '../components/pickers'
import {
  LEAD_OPTIONS,
  loadNotifPrefs,
  loadNotifPrefsCloud,
  saveNotifPrefsCloud,
  saveNotifPrefsLocal,
  type NotificationPrefs,
} from '../lib/notifyPrefs'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import {
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/reminders'
import { disablePush, enablePush, isPushConfigured, sendServerTestPush } from '../lib/push'

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
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => loadNotifPrefs())

  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  // pull cloud-synced notification prefs once on sign-in
  useEffect(() => {
    if (!user) return
    void loadNotifPrefsCloud(user.uid).then((p) => {
      if (p) {
        setNotifPrefs(p)
        saveNotifPrefsLocal(p)
      }
    })
  }, [user])

  const updateNotifPref = (key: keyof NotificationPrefs, value: number) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: value }
      saveNotifPrefsLocal(next)
      if (user) void saveNotifPrefsCloud(user.uid, next)
      return next
    })
  }

  const sendTestNotification = async () => {
    if (!notificationsSupported()) {
      toast('התראות לא נתמכות בדפדפן זה', 'error')
      return
    }
    // real push: register this device, then have the server push to it so the
    // notification arrives even when the app is closed/backgrounded.
    if (isPushConfigured && user) {
      const token = await enablePush(user.uid)
      if (!token) {
        setNotifGranted(false)
        toast('צריך לאשר התראות בדפדפן', 'error')
        return
      }
      setNotifGranted(true)
      try {
        const sent = await sendServerTestPush()
        toast(
          sent > 0 ? 'נשלחה התראה לטלפון — מזערו את האפליקציה כדי לראות אותה מגיעה' : 'המכשיר נרשם — נסו שוב בעוד רגע',
          sent > 0 ? 'success' : 'info',
        )
      } catch {
        toast('שליחת הבדיקה נכשלה, נסו שוב', 'error')
      }
      return
    }
    // fallback (no VAPID configured): show a local notification
    let perm = Notification.permission
    if (perm !== 'granted') perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      toast('צריך לאשר התראות בדפדפן', 'error')
      return
    }
    setNotifGranted(true)
    const opts = {
      body: 'זו התראת ניסיון — ההתראות עובדות! 🎉',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl' as const,
      lang: 'he',
      tag: 'car360-test',
    }
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification('Car360 · בדיקה', opts)
    else new Notification('Car360 · בדיקה', opts)
    toast('נשלחה התראת ניסיון')
  }

  const toggleNotifications = async (v: boolean) => {
    if (!v) {
      if (isPushConfigured && user) await disablePush(user.uid)
      setNotifGranted(false)
      toast('ההתראות כובו במכשיר הזה', 'info')
      return
    }
    // real web-push when configured (works even when the app is closed)
    if (isPushConfigured && user) {
      const token = await enablePush(user.uid)
      setNotifGranted(Boolean(token))
      toast(
        token ? 'התראות הופעלו — נזכיר גם כשהאפליקציה סגורה' : 'ההרשאה נדחתה בדפדפן',
        token ? 'success' : 'error',
      )
      return
    }
    // fallback: on-device reminder notifications
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

        {/* design → its own screen, so this list stays short */}
        <Link to="/settings/design" className="block">
          <Card className="!p-0">
            <SettingRow
              icon={<IconSparkles size={20} />}
              title="עיצוב ותצוגה"
              subtitle="צבעים, שפת עיצוב ופריסת דף הבית"
            >
              <IconChevronLeft size={20} className="text-ink-3" />
            </SettingRow>
          </Card>
        </Link>

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
            subtitle={
              !notificationsSupported()
                ? 'לא נתמך בדפדפן זה'
                : isPushConfigured
                  ? 'תזכורת לתאריכים קרובים — גם כשהאפליקציה סגורה'
                  : 'תזכורת יומית לתאריכים קרובים'
            }
          >
            <Switch
              checked={notifGranted}
              onChange={(v) => void toggleNotifications(v)}
              label="התראות"
            />
          </SettingRow>
          <button className="w-full" onClick={() => void sendTestNotification()}>
            <SettingRow
              icon={<IconSparkles size={20} />}
              title="שליחת התראת ניסיון"
              subtitle="בדקו שההתראות מגיעות אליכם"
            >
              <span className="text-sm font-bold text-cta">שליחה</span>
            </SettingRow>
          </button>
        </Card>

        {/* when to alert — one place for every reminder type */}
        <Card className="space-y-1 !p-4">
          <div className="mb-1 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2">
              <IconBell size={20} />
            </span>
            <div>
              <p className="font-bold">מתי להתריע</p>
              <p className="text-xs text-ink-3">כמה זמן מראש להזכיר על כל סוג — הכל במקום אחד</p>
            </div>
          </div>
          <NotifPrefRow label="טסט (רישוי שנתי)" value={notifPrefs.test} onChange={(v) => updateNotifPref('test', v)} />
          <NotifPrefRow label="ביטוח" value={notifPrefs.insurance} onChange={(v) => updateNotifPref('insurance', v)} />
          <NotifPrefRow label="טיפול קרוב" value={notifPrefs.service} onChange={(v) => updateNotifPref('service', v)} />
          <NotifPrefRow label="תזכורות מותאמות" value={notifPrefs.custom} onChange={(v) => updateNotifPref('custom', v)} />
          <NotifPrefRow label="בלוקים עם תזכורת" value={notifPrefs.block} onChange={(v) => updateNotifPref('block', v)} />
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
              ? 'הנתונים מסונכרנים ומאובטחים בחשבון Google שלך.'
              : 'מצב מקומי — הנתונים נשמרים רק במכשיר הזה.'}
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

function NotifPrefRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <div className="w-44 shrink-0">
        <Select
          title={label}
          value={String(value)}
          onChange={(v) => onChange(Number(v))}
          options={LEAD_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
        />
      </div>
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
