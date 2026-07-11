/** Centralised notification preferences: for each reminder type, how many days
 *  in advance to start alerting (0 = off). Stored in localStorage and synced to
 *  Firestore (users/{uid}.notifications) so the scheduled Cloud Function can
 *  respect the same choices. */

import { getFirebaseApp, isFirebaseConfigured } from './firebase'
import type { DerivedReminder } from '../types'

export type NotifSource = DerivedReminder['source'] // 'test'|'license'|'insurance'|'service'|'block'|'custom'

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

/** Lead-time options offered in the UI (days; 0 = off). */
export const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'כבוי' },
  { value: 1, label: 'יום לפני' },
  { value: 3, label: '3 ימים לפני' },
  { value: 7, label: 'שבוע לפני' },
  { value: 14, label: 'שבועיים לפני' },
  { value: 30, label: 'חודש לפני' },
  { value: 60, label: 'חודשיים לפני' },
]

const KEY = 'car360:notifPrefs'

export function loadNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_NOTIF_PREFS }
    return { ...DEFAULT_NOTIF_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) }
  } catch {
    return { ...DEFAULT_NOTIF_PREFS }
  }
}

export function saveNotifPrefsLocal(prefs: NotificationPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

/** Lead-time for a derived reminder's source (license falls back to test). */
export function leadDaysFor(source: NotifSource, prefs: NotificationPrefs): number {
  if (source === 'license') return prefs.test
  return prefs[source as keyof NotificationPrefs] ?? 14
}

export async function loadNotifPrefsCloud(uid: string): Promise<NotificationPrefs | null> {
  if (!isFirebaseConfigured) return null
  try {
    const app = await getFirebaseApp()
    const { getFirestore, doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(getFirestore(app), 'users', uid))
    const n = snap.data()?.notifications as Partial<NotificationPrefs> | undefined
    return n ? { ...DEFAULT_NOTIF_PREFS, ...n } : null
  } catch {
    return null
  }
}

export async function saveNotifPrefsCloud(uid: string, prefs: NotificationPrefs): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    const app = await getFirebaseApp()
    const { getFirestore, doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(getFirestore(app), 'users', uid), { notifications: prefs }, { merge: true })
  } catch {
    // offline / rules — local persistence still applies
  }
}
