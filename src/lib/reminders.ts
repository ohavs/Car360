import { repo } from '../data'
import type { Car, DerivedReminder } from '../types'
import { daysUntil } from './utils'

export function carDisplayName(car: Car): string {
  return car.nickname || `${car.make} ${car.model}`.trim() || car.plate
}

/** Collect every upcoming/overdue date across all cars:
 *  test, license fee, insurance end, next service due, date blocks with
 *  remind=true, and custom reminders. */
export async function collectReminders(cars: Car[]): Promise<DerivedReminder[]> {
  const out: DerivedReminder[] = []

  for (const car of cars) {
    const name = carDisplayName(car)
    const push = (r: Omit<DerivedReminder, 'daysLeft' | 'carId' | 'carName' | 'carImage'>) =>
      out.push({ ...r, carId: car.id, carName: name, carImage: car.imageUrl, daysLeft: daysUntil(r.dueDate) })

    if (car.testExpiry)
      push({ key: `test:${car.id}`, title: 'חידוש טסט (רישוי שנתי)', dueDate: car.testExpiry, source: 'test' })

    for (const block of car.blocks) {
      if (block.type === 'date' && block.remind && block.value)
        push({ key: `block:${car.id}:${block.id}`, title: block.title, dueDate: block.value, source: 'block' })
    }

    const [insurances, services, custom] = await Promise.all([
      repo.listInsurances(car.id),
      repo.listServices(car.id),
      repo.listReminders(car.id),
    ])

    // only the latest end-date per insurance kind matters
    const latestByKind = new Map<string, string>()
    for (const ins of insurances) {
      const prev = latestByKind.get(ins.kind)
      if (!prev || ins.endDate > prev) latestByKind.set(ins.kind, ins.endDate)
    }
    for (const [kind, endDate] of latestByKind) {
      push({ key: `ins:${car.id}:${kind}`, title: `סיום ביטוח ${kind}`, dueDate: endDate, source: 'insurance' })
    }

    for (const s of services) {
      if (s.nextDueDate)
        push({ key: `svc:${car.id}:${s.id}`, title: `טיפול קרוב: ${s.title}`, dueDate: s.nextDueDate, source: 'service' })
    }

    for (const r of custom) {
      if (!r.done)
        push({ key: `custom:${car.id}:${r.id}`, title: r.title, dueDate: r.dueDate, time: r.time, source: 'custom', customId: r.id })
    }
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}

/* ---------- Local notifications ---------- */

const NOTIFIED_KEY = 'car360:lastNotifiedDay'

export function notificationsSupported(): boolean {
  return 'Notification' in window
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

/** Once per day, surface a notification for anything due within 14 days.
 *  Runs on app open (and PWA launch) — no server needed. */
export async function notifyUpcoming(cars: Car[]): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const today = new Date().toDateString()
  if (localStorage.getItem(NOTIFIED_KEY) === today) return

  const reminders = (await collectReminders(cars)).filter((r) => r.daysLeft <= 14)
  if (reminders.length === 0) return
  localStorage.setItem(NOTIFIED_KEY, today)

  const top = reminders[0]
  const body =
    reminders.length === 1
      ? `${top.title} — ${top.carName}`
      : `${top.title} — ${top.carName} ועוד ${reminders.length - 1} תזכורות`

  const reg = await navigator.serviceWorker?.getRegistration()
  const title = top.daysLeft < 0 ? 'תזכורת שפג תוקפה!' : 'תזכורות קרובות לרכב'
  if (reg) {
    await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' })
  } else {
    new Notification(title, { body, icon: '/icons/icon-192.png' })
  }
}
