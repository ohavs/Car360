/** Firebase Cloud Messaging (web push) — real notifications that arrive even
 *  when the app is closed. Optional: active only when a VAPID key is set
 *  (VITE_FCM_VAPID_KEY, from Firebase Console → Cloud Messaging → Web Push
 *  certificates). Without it the app keeps using on-device reminder
 *  notifications. All Firebase imports are lazy so nothing loads unless used. */

import { getFirebaseApp, isFirebaseConfigured } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'PushManager' in window
  )
}

export const isPushConfigured = Boolean(isFirebaseConfigured && VAPID_KEY) && pushSupported()

async function messagingApi() {
  const app = await getFirebaseApp()
  const m = await import('firebase/messaging')
  if (!(await m.isSupported())) throw new Error('messaging unsupported')
  return { m, messaging: m.getMessaging(app) }
}

async function tokenDocRef(uid: string, token: string) {
  const app = await getFirebaseApp()
  const fs = await import('firebase/firestore')
  return { fs, ref: fs.doc(fs.getFirestore(app), 'users', uid, 'fcmTokens', token) }
}

/** Obtain the FCM token for this device and store it under the user.
 *  Shared by the explicit opt-in and the silent self-heal below. */
async function registerToken(uid: string): Promise<string | null> {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const { m, messaging } = await messagingApi()
  const token = await m.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  if (!token) return null

  const { fs, ref } = await tokenDocRef(uid, token)
  await fs.setDoc(ref, {
    token,
    platform: navigator.userAgent.slice(0, 180),
    updatedAt: Date.now(),
  })
  return token
}

/** Request permission, obtain an FCM token and persist it for this user.
 *  Returns the token on success, or null if permission was denied / failed. */
export async function enablePush(uid: string): Promise<string | null> {
  if (!isPushConfigured) return null
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null
  return registerToken(uid)
}

/** Make sure a device that already granted permission actually has a token
 *  registered — never prompts. Called on every app start because:
 *   - permission can predate push being configured (then no token was ever
 *     stored, and the UI would still look "on"), and
 *   - FCM rotates tokens, so a stored one can go stale.
 *  getToken returns the existing token when it is still valid, so this is
 *  cheap and idempotent. */
export async function ensurePushRegistered(uid: string): Promise<string | null> {
  if (!isPushConfigured) return null
  if (Notification.permission !== 'granted') return null
  try {
    return await registerToken(uid)
  } catch {
    return null
  }
}

/** Revoke this device's push token (best-effort). */
export async function disablePush(uid: string): Promise<void> {
  if (!isPushConfigured) return
  try {
    const { m, messaging } = await messagingApi()
    const token = await m.getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)
    await m.deleteToken(messaging).catch(() => {})
    if (token) {
      const { fs, ref } = await tokenDocRef(uid, token)
      await fs.deleteDoc(ref).catch(() => {})
    }
  } catch {
    // nothing to revoke
  }
}

/** Ask the server to push a test notification to this user's registered
 *  devices. Returns how many were sent (0 if no device is registered). */
export async function sendServerTestPush(): Promise<number> {
  const app = await getFirebaseApp()
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const fn = httpsCallable<unknown, { sent: number }>(getFunctions(app, 'us-central1'), 'sendTestPush')
  const res = await fn()
  return res.data?.sent ?? 0
}

/** Show foreground messages (app open) as a native notification. Call once. */
export async function listenForegroundPush(): Promise<void> {
  if (!isPushConfigured) return
  try {
    const { m, messaging } = await messagingApi()
    m.onMessage(messaging, (payload) => {
      const n = payload.notification
      if (n && Notification.permission === 'granted') {
        new Notification(n.title || 'Car360', { body: n.body, icon: '/icons/icon-192.png' })
      }
    })
  } catch {
    // messaging unsupported in this browser — ignore
  }
}
