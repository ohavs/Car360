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
} from '../components/icons'
import { Card, ConfirmDialog, Switch, spring } from '../components/ui'
import { PALETTES, SKINS } from '../lib/palettes'
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

/** Captured install prompt for the "Install app" action (Chrome/Android). */
let deferredInstallPrompt: (Event & { prompt: () => Promise<void> }) | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e as Event & { prompt: () => Promise<void> }
})

export default function SettingsPage() {
  const { user, signOut, isCloud } = useAuth()
  const { theme, toggle, palette, setPalette, skin, setSkin, restyling } = useTheme()
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
