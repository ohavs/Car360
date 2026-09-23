/** When to alert about each reminder. Pure, so the phone (local alarms) and
 *  the server (push) agree on the same moments and the same ids. */
import { leadDaysFor, type NotificationPrefs } from './notifyPrefs'
import type { DerivedReminder } from './types'

/** Alert on these day-counts only (plus the lead day itself) — not daily. */
export const MILESTONES = [30, 14, 7, 3, 1, 0]

export interface PlannedNotification {
  /** `${reminder.key}:${daysBefore}` — also the Android notification tag, so
   *  a server push for the same moment replaces the local one */
  id: string
  title: string
  body: string
  at: Date
  /** where a tap leads */
  url: string
  reminderKey: string
  source: DerivedReminder['source']
  customId?: string
  carId: string
}

export function duePhrase(days: number): string {
  if (days === 0) return 'היום'
  if (days === 1) return 'מחר'
  if (days === 7) return 'בעוד שבוע'
  if (days === 14) return 'בעוד שבועיים'
  if (days === 30) return 'בעוד חודש'
  return `בעוד ${days} ימים`
}

export function urlFor(r: Pick<DerivedReminder, 'source' | 'carId'>): string {
  switch (r.source) {
    case 'insurance':
      return `/car/${r.carId}/insurance`
    case 'service':
      return `/car/${r.carId}/services`
    case 'custom':
      return '/reminders'
    default:
      return `/car/${r.carId}`
  }
}

function atTime(iso: string, time: string, daysBefore: number): Date {
  const [y, m, d] = iso.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d - daysBefore, hh || 0, mm || 0, 0, 0)
}

/**
 * Every future alert for the given reminders, soonest first, capped (Android
 * keeps at most ~500 alarms per app; we stay far below).
 */
export function planNotifications(
  reminders: DerivedReminder[],
  prefs: NotificationPrefs,
  defaultTime: string,
  now: Date = new Date(),
  { horizonDays = 60, max = 100 } = {},
): PlannedNotification[] {
  const horizon = now.getTime() + horizonDays * 86_400_000
  const out: PlannedNotification[] = []

  for (const r of reminders) {
    const lead = leadDaysFor(r.source, prefs)
    if (lead <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(r.dueDate)) continue
    const days = new Set(MILESTONES.filter((m) => m <= lead))
    days.add(lead)
    for (const before of days) {
      // a reminder with its own time rings then on the day itself; earlier
      // heads-ups use the everyday alert time
      const at = atTime(r.dueDate, before === 0 && r.time ? r.time : defaultTime, before)
      if (at.getTime() <= now.getTime() || at.getTime() > horizon) continue
      out.push({
        id: `${r.key}:${before}`,
        title: r.title,
        body: `${r.carName} · ${duePhrase(before)}`,
        at,
        url: urlFor(r),
        reminderKey: r.key,
        source: r.source,
        customId: r.customId,
        carId: r.carId,
      })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max)
}
