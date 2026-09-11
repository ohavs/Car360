import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import {
  IconBell,
  IconCheck,
  IconDownload,
  IconInstall,
  IconLogout,
  IconMoon,
  IconShield,
  IconSparkles,
} from '../components/icons'
import { Card, ConfirmDialog, Switch, spring } from '../components/ui'
import { Select } from '../components/pickers'
import { PALETTES, SKINS } from '../lib/palettes'
import { LAYOUT_OPTIONS, readLayout, writeLayout, type LayoutId } from '../lib/homeLayout'
import {
  LEAD_OPTIONS,
  loadNotifPrefs,
  loadNotifPrefsCloud,
  saveNotifPrefsCloud,
  saveNotifPrefsLocal,
  type NotificationPrefs,
} from '../lib/notifyPrefs'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import {
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/reminders'
import { disablePush, enablePush, ensurePushRegistered, isPushConfigured, sendServerTestPush } from '../lib/push'

/** Captured install prompt for the "Install app" action (Chrome/Android). */
let deferredInstallPrompt: (Event & { prompt: () => Promise<void> }) | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e as Event & { prompt: () => Promise<void> }
})

export default function SettingsPage() {
  const { user, signOut, isCloud } = useAuth()
  const { theme, toggle, palette, setPalette, skin, setSkin, accent, setAccent, glow, setGlow, restyling } =
    useTheme()
  const { toast } = useToast()
  const { cars } = useCars()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [notifGranted, setNotifGranted] = useState(
    () => notificationsSupported() && Notification.permission === 'granted',
  )
  const [standalone, setStandalone] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => loadNotifPrefs())
  const [homeLayout, setHomeLayout] = useState<LayoutId>(() => readLayout())

  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  // the switch must reflect whether this device is actually registered for
  // push — browser permission alone does not mean the server can reach it
  useEffect(() => {
    if (!isPushConfigured || !user) return
    void ensurePushRegistered(user.uid).then((token) => setNotifGranted(Boolean(token)))
  }, [user])

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

        {/* design studio */}
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-black">עיצוב</h2>
            <p className="text-xs text-ink-3">פלטת צבעים ושפת עיצוב — הכל מתעדכן בכל האפליקציה</p>
          </div>

          {/* palette picker */}
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink-2">פלטת צבעים</p>
            <div className="flex justify-between">
              {PALETTES.map((p) => {
                const active = palette === p.id
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.88 }}
                    transition={spring}
                    disabled={restyling}
                    onClick={() => !active && setPalette(p.id)}
                    aria-label={`פלטת ${p.label}`}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'relative flex size-12 items-center justify-center overflow-hidden rounded-full ring-2 transition-all',
                        active ? 'ring-cta ring-offset-2 ring-offset-card' : 'ring-line',
                      )}
                    >
                      <span className="absolute inset-0" style={{ background: p.preview[2] }} />
                      <span
                        className="absolute inset-y-0 start-0 w-1/2"
                        style={{ background: p.preview[0] }}
                      />
                      <span
                        className="absolute bottom-0 end-0 size-1/2 rounded-tl-full"
                        style={{ background: p.preview[1] }}
                      />
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={spring}
                          className="relative z-10 flex size-5 items-center justify-center rounded-full bg-white text-ink shadow-card"
                        >
                          <IconCheck size={12} className="text-black" />
                        </motion.span>
                      )}
                    </span>
                    <span className={cn('text-[11px] font-bold', active ? 'text-ink' : 'text-ink-3')}>
                      {p.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* design language picker */}
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink-2">שפת עיצוב</p>
            <div className="grid grid-cols-2 gap-3">
              {SKINS.map((s) => {
                const active = skin === s.id
                return (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    disabled={restyling}
                    onClick={() => !active && setSkin(s.id)}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-3.5 text-start ring-2 transition-all',
                      active ? 'ring-cta' : 'ring-line',
                    )}
                  >
                    {/* mini preview */}
                    <span
                      className={cn(
                        'mb-2.5 block h-14 overflow-hidden rounded-xl',
                        s.id === 'glass' &&
                          'bg-gradient-to-br from-sky-300/70 via-fuchsia-300/50 to-amber-200/70 dark:from-sky-500/40 dark:via-fuchsia-500/30 dark:to-amber-400/30',
                        s.id === 'minimal' && 'bg-card-2',
                        s.id === 'neu' && 'bg-slate-200 dark:bg-slate-800',
                        s.id === 'aurora' &&
                          'bg-[radial-gradient(circle_at_20%_20%,#6366f1,transparent_45%),radial-gradient(circle_at_80%_30%,#d946ef,transparent_45%),radial-gradient(circle_at_50%_80%,#22d3ee,transparent_45%)] bg-[#0b0820]',
                      )}
                    >
                      {[0, 1].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'mx-2.5 block h-6 rounded-lg',
                            i === 0 ? 'mt-2.5' : 'mt-1.5 w-2/3',
                            s.id === 'glass' &&
                              'border border-white/60 bg-white/40 shadow-card backdrop-blur-sm dark:border-white/20 dark:bg-white/10',
                            s.id === 'minimal' && 'bg-card shadow-card',
                            s.id === 'neu' &&
                              'bg-slate-200 shadow-[4px_4px_8px_rgb(148_163_184/0.7),-4px_-4px_8px_white] dark:bg-slate-800 dark:shadow-[4px_4px_8px_rgb(0_0_0/0.6),-4px_-4px_8px_rgb(255_255_255/0.05)]',
                            s.id === 'aurora' && 'border border-white/40 bg-white/20 backdrop-blur-sm',
                          )}
                        />
                      ))}
                    </span>
                    <span className="block text-sm font-black">{s.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{s.description}</span>
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={spring}
                        className="absolute end-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-cta text-white shadow-card"
                      >
                        <IconCheck size={14} />
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* personal accent color */}
          <AccentPicker accent={accent} setAccent={setAccent} />

          {/* cockpit glow intensity */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink-2">עוצמת זוהר הרכב</p>
              <span className="text-[11px] font-bold text-ink-3">{Math.round(glow * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={140}
              value={Math.round(glow * 100)}
              onChange={(e) => setGlow(Number(e.target.value) / 100)}
              aria-label="עוצמת זוהר הרכב"
              className="h-3 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-l from-cta/80 to-cta/10 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/0.4)] [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/10"
            />
            <p className="mt-1.5 text-[11px] text-ink-3">הזוהר הצבעוני שמאחורי האפליקציה נלקח מתמונת הרכב הפעיל</p>
          </div>

          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink-2">צפיפות דף הבית</p>
            <div className="flex gap-2">
              {LAYOUT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setHomeLayout(o.id)
                    writeLayout(o.id)
                  }}
                  aria-pressed={homeLayout === o.id}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold ring-1 transition-colors',
                    homeLayout === o.id ? 'bg-cta-soft text-cta ring-cta/30' : 'bg-card-2 text-ink-2 ring-line',
                  )}
                >
                  <o.icon size={20} />
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">משפיע על סידור המשבצות בדף הבית</p>
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

const ACCENT_PRESETS = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488',
  '#0284c7', '#4f46e5', '#7c3aed', '#db2777', '#e11d48',
]

function AccentPicker({
  accent,
  setAccent,
}: {
  accent: string | null
  setAccent: (hex: string | null) => void
}) {
  const [hue, setHue] = useState(265)

  return (
    <div>
      <p className="mb-2.5 text-[13px] font-semibold text-ink-2">צבע דגש</p>
      <div className="flex flex-wrap gap-2.5">
        {/* default (palette) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={spring}
          onClick={() => setAccent(null)}
          aria-label="ברירת מחדל"
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-[10px] font-black ring-2 transition-all',
            accent === null ? 'ring-cta ring-offset-2 ring-offset-card' : 'ring-line',
          )}
          style={{ background: 'linear-gradient(135deg,var(--color-accent),var(--color-card-2))' }}
        >
          {accent === null && <IconCheck size={14} className="text-white mix-blend-difference" />}
        </motion.button>

        {ACCENT_PRESETS.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.85 }}
            transition={spring}
            onClick={() => setAccent(c)}
            aria-label={`צבע ${c}`}
            className={cn(
              'flex size-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-all',
              accent === c ? 'ring-ink' : 'ring-transparent',
            )}
            style={{ background: c }}
          >
            {accent === c && <IconCheck size={15} className="text-white" />}
          </motion.button>
        ))}
      </div>

      {/* custom hue slider */}
      <div className="mt-3.5 flex items-center gap-3">
        <span
          className="size-9 shrink-0 rounded-full ring-1 ring-line"
          style={{ background: `hsl(${hue} 72% 52%)` }}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => {
            const h = Number(e.target.value)
            setHue(h)
            setAccent(`hsl(${h} 72% 52%)`)
          }}
          aria-label="בחירת גוון מותאם"
          className="h-3 flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/0.4)] [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/10"
          style={{
            background:
              'linear-gradient(90deg,hsl(0 72% 52%),hsl(60 72% 52%),hsl(120 72% 52%),hsl(180 72% 52%),hsl(240 72% 52%),hsl(300 72% 52%),hsl(360 72% 52%))',
          }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">בחרו צבע מוכן או גררו לגוון מותאם אישית</p>
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
