/** Centralised notification preferences: for each reminder type, how many days
 *  in advance to start alerting (0 = off). Stored in localStorage and synced to
 *  Firestore (users/{uid}.notifications) so the scheduled Cloud Function can
 *  respect the same choices. */

import { getFirestoreDb, isFirebaseConfigured } from './firebase'
import type { DerivedReminder } from '../types'
import { DEFAULT_NOTIF_PREFS, type NotificationPrefs } from '../../shared/notifyPrefs'

export type NotifSource = DerivedReminder['source'] // 'test'|'license'|'insurance'|'service'|'block'|'custom'

// the prefs model and its defaults are shared with the Android app
export { DEFAULT_NOTIF_PREFS, LEAD_OPTIONS, leadDaysFor, type NotificationPrefs } from '../../shared/notifyPrefs'
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

export async function loadNotifPrefsCloud(uid: string): Promise<NotificationPrefs | null> {
  if (!isFirebaseConfigured) return null
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(await getFirestoreDb(), 'users', uid))
    const n = snap.data()?.notifications as Partial<NotificationPrefs> | undefined
    return n ? { ...DEFAULT_NOTIF_PREFS, ...n } : null
  } catch {
    return null
  }
}

export async function saveNotifPrefsCloud(uid: string, prefs: NotificationPrefs): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(await getFirestoreDb(), 'users', uid), { notifications: prefs }, { merge: true })
  } catch {
    // offline / rules — local persistence still applies
  }
}
