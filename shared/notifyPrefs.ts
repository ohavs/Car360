/** Notification preferences, shared by the apps and mirrored by the Cloud
 *  Function: per reminder type, how many days ahead to start alerting
 *  (0 = off), and the hour of day to alert at. Stored in users/{uid}. */
import type { DerivedReminder } from './types'

export interface NotificationPrefs {
  test: number
  insurance: number
  service: number
  custom: number
  block: number
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  test: 30,
  insurance: 14,
  service: 14,
  custom: 3,
  block: 7,
}

/** Default alert time. The server's daily run is at 08:00 too, so a pushed
 *  copy lands together with the local one and replaces it (same tag). */
export const DEFAULT_NOTIFY_TIME = '08:00'

export const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'כבוי' },
  { value: 1, label: 'יום לפני' },
  { value: 3, label: '3 ימים לפני' },
  { value: 7, label: 'שבוע לפני' },
  { value: 14, label: 'שבועיים לפני' },
  { value: 30, label: 'חודש לפני' },
  { value: 60, label: 'חודשיים לפני' },
]

export const PREF_LABELS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'test', label: 'טסט ורישיון רכב' },
  { key: 'insurance', label: 'ביטוחים' },
  { key: 'service', label: 'טיפולים' },
  { key: 'custom', label: 'תזכורות שלי' },
  { key: 'block', label: 'תאריכים בשדות שלי' },
]

/** Lead time for a reminder's source (license follows test). */
export function leadDaysFor(source: DerivedReminder['source'], prefs: NotificationPrefs): number {
  if (source === 'license') return prefs.test
  return prefs[source as keyof NotificationPrefs] ?? 14
}
