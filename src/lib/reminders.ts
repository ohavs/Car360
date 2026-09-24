import { repo } from '../data'
import { carDisplayName, deriveReminders } from '../../shared/reminders'
import type { Car, DerivedReminder } from '../types'
import { leadDaysFor, loadNotifPrefs } from './notifyPrefs'

export { carDisplayName }

/** Collect every upcoming/overdue date across all cars — the same rules as
 *  the Android app (shared/reminders.ts): test, licence, insurance end, next
 *  service due, date blocks with remind=true, and open custom reminders. */
export async function collectReminders(cars: Car[]): Promise<DerivedReminder[]> {
  // cars in parallel: each needs three collection reads
  const perCar = await Promise.all(
    cars.map(async (car) => {
      const [insurances, services, reminders] = await Promise.all([
        repo.listInsurances(car.id),
        repo.listServices(car.id),
        repo.listReminders(car.id),
      ])
      return deriveReminders(car, { insurances, services, reminders })
    }),
  )
  return perCar.flat().sort((a, b) => a.daysLeft - b.daysLeft)
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

  // honour the per-type lead times configured in Settings (0 = off)
  const prefs = loadNotifPrefs()
  const reminders = (await collectReminders(cars)).filter((r) => {
    const lead = leadDaysFor(r.source, prefs)
    return lead > 0 && r.daysLeft <= lead
  })
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
