import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import { IconBell, IconCheck, IconPlus } from '../components/icons'
import { motion } from 'motion/react'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  listItem,
  listStagger,
} from '../components/ui'
import { DateInput, Select, TimeInput } from '../components/pickers'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import {
  carDisplayName,
  collectReminders,
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/reminders'
import { cn, dueLabel, dueStatus, formatDate, newId, todayISO } from '../lib/utils'
import type { DerivedReminder } from '../types'

const statusTone = { none: 'neutral', ok: 'ok', warn: 'warn', danger: 'danger' } as const

const sourceLabel: Record<DerivedReminder['source'], string> = {
  test: 'טסט',
  license: 'רישיון',
  insurance: 'ביטוח',
  service: 'טיפול',
  block: 'מותאם אישית',
  custom: 'תזכורת',
}

export default function RemindersPage() {
  const { cars, loading: carsLoading } = useCars()
  const { toast } = useToast()
  const [reminders, setReminders] = useState<DerivedReminder[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  )

  const reload = useCallback(async () => {
    setReminders(await collectReminders(cars))
  }, [cars])

  useEffect(() => {
    if (!carsLoading) void reload()
  }, [carsLoading, reload])

  const markDone = async (r: DerivedReminder) => {
    if (r.source !== 'custom' || !r.customId) return
    const list = await repo.listReminders(r.carId)
    const rec = list.find((x) => x.id === r.customId)
    if (rec) await repo.saveReminder({ ...rec, done: true, updatedAt: Date.now() })
    await reload()
    toast('התזכורת סומנה כבוצעה')
  }

  const enableNotifications = async () => {
    const ok = await requestNotificationPermission()
    setNotifState(ok ? 'granted' : Notification.permission)
    toast(ok ? 'התראות הופעלו' : 'ההרשאה לא אושרה', ok ? 'success' : 'error')
  }

  const loading = carsLoading || reminders === null

  return (
    <div className="px-4">
      <PageHeader
        title="תזכורות"
        subtitle="טסט, ביטוחים, טיפולים — הכל במקום אחד"
        action={
          cars.length > 0 ? (
            <button
              aria-label="תזכורת חדשה"
              onClick={() => setAdding(true)}
              className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-card active:scale-90"
            >
              <IconPlus size={20} />
            </button>
          ) : undefined
        }
      />

      {notifState === 'default' && (
        <Card className="mb-4 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2">
            <IconBell size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">רוצים לקבל התראות?</p>
            <p className="text-xs text-ink-3">נזכיר לפני שהטסט או הביטוח נגמרים</p>
          </div>
          <Button variant="secondary" className="!min-h-10 !px-4 text-sm" onClick={() => void enableNotifications()}>
            הפעלה
          </Button>
        </Card>
      )}

      {loading ? (
        <ListSkeleton />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={<IconBell size={26} />}
          title="אין תזכורות"
          subtitle="הוסיפו תאריכי טסט וביטוח לרכבים — והם יופיעו כאן אוטומטית"
        />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3 pb-8">
          {reminders.map((r) => {
            const st = dueStatus(r.dueDate)
            return (
              <motion.div key={r.key} variants={listItem}>
                <Card className="flex items-center gap-3">
                  <span className="flex h-16 w-20 shrink-0 items-center justify-center">
                    {r.carImage ? (
                      <img
                        src={r.carImage}
                        alt={r.carName}
                        className="max-h-16 w-auto max-w-full object-contain drop-shadow-[0_8px_8px_rgb(0_0_0/0.22)]"
                      />
                    ) : (
                      <span
                        className={cn(
                          'flex size-12 items-center justify-center rounded-2xl',
                          st === 'danger' && 'bg-danger-soft text-danger',
                          st === 'warn' && 'bg-warn-soft text-warn',
                          (st === 'ok' || st === 'none') && 'bg-ok-soft text-ok',
                        )}
                      >
                        <IconBell size={22} />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-black leading-snug">{r.title}</p>
                      <Badge tone={statusTone[st]} className="shrink-0">
                        {dueLabel(r.dueDate)}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-ink-3">
                      {r.carName} · {formatDate(r.dueDate)}
                      {r.time ? ` · ${r.time}` : ''} · {sourceLabel[r.source]}
                    </p>
                    {r.source === 'custom' && (
                      <button
                        onClick={() => void markDone(r)}
                        className="mt-2 flex items-center gap-1 rounded-full bg-white/40 px-3 py-1 text-xs font-bold text-ink-2 active:scale-95 dark:bg-white/10"
                      >
                        <IconCheck size={14} />
                        בוצע
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {adding && (
        <AddReminderSheet
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void reload()
          }}
        />
      )}
    </div>
  )
}

function AddReminderSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { cars, activeCarId } = useCars()
  const { toast } = useToast()
  const [carId, setCarId] = useState(activeCarId ?? cars[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const now = Date.now()
    await repo.saveReminder({
      id: newId(),
      carId,
      title: title.trim(),
      dueDate,
      time: time || undefined,
      done: false,
      createdAt: now,
      updatedAt: now,
    })
    toast('התזכורת נוספה')
    onSaved()
  }

  return (
    <BottomSheet title="תזכורת חדשה" onClose={onClose}>
      <div className="space-y-4">
        <Field label="רכב">
          <Select
            title="בחירת רכב"
            value={carId}
            onChange={setCarId}
            options={cars.map((c) => ({ value: c.id, label: carDisplayName(c) }))}
          />
        </Field>
        <Field label="מה להזכיר?">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="חידוש מנוי חניה…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="תאריך יעד">
            <DateInput value={dueDate} onChange={setDueDate} min={todayISO()} />
          </Field>
          <Field label="שעה (אופציונלי)">
            <TimeInput value={time} onChange={setTime} />
          </Field>
        </div>
        <Button className="w-full" disabled={!title.trim() || !dueDate || !carId || saving} onClick={() => void save()}>
          {saving ? 'שומר…' : 'הוספת תזכורת'}
        </Button>
      </div>
    </BottomSheet>
  )
}
