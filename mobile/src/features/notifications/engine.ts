import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore'
import * as Notifications from 'expo-notifications'
import type { NotificationPrefs } from '@shared/notifyPrefs'
import { planNotifications, type PlannedNotification } from '@shared/notifySchedule'
import type { CustomReminder, DerivedReminder } from '@shared/types'
import DeviceHealth from '../../../modules/device-health'
import { readPref, writePref } from '../../lib/storage'
import { commit } from '../../data/sync'
import { todayISO } from '@shared/utils'

export const REMINDER_CHANNEL = 'reminders'
const SNOOZE_SUFFIX = ':snooze'
const TEST_ID = 'car360:test'

/** Foreground: show reminders as a normal heads-up, like when the app is closed. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/** Channels are the user's per-type switches in Android settings. */
export async function ensureChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'תזכורות',
    description: 'טסט, ביטוחים, טיפולים ותזכורות שלכם',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 120, 220],
    lightColor: '#dc2626',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
  await Notifications.setNotificationChannelAsync('app-updates', {
    name: 'עדכוני אפליקציה',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
  await Notifications.setNotificationChannelAsync('general', {
    name: 'כללי',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
  // the buttons under a reminder; each opens the app just long enough to act
  await Notifications.setNotificationCategoryAsync('reminder', [
    { identifier: 'snooze', buttonTitle: 'הזכר לי מחר', options: { opensAppToForeground: true } },
  ])
  await Notifications.setNotificationCategoryAsync('custom-reminder', [
    { identifier: 'done', buttonTitle: 'בוצע', options: { opensAppToForeground: true } },
    { identifier: 'snooze', buttonTitle: 'הזכר לי מחר', options: { opensAppToForeground: true } },
  ])
}

function contentFor(n: Pick<PlannedNotification, 'title' | 'body' | 'url' | 'customId' | 'carId' | 'source'>) {
  return {
    title: n.title,
    body: n.body,
    data: { url: n.url, customId: n.customId ?? null, carId: n.carId, source: n.source },
    categoryIdentifier: n.source === 'custom' ? 'custom-reminder' : 'reminder',
    color: '#dc2626',
  }
}

/**
 * Brings the device's alarms in line with the reminders. Skips the work when
 * nothing changed since last time; snoozed alerts survive a reschedule.
 */
export async function reschedule(
  reminders: DerivedReminder[],
  prefs: NotificationPrefs,
  time: string,
): Promise<PlannedNotification[]> {
  const plan = planNotifications(reminders, prefs, time)
  const signature = JSON.stringify(plan.map((p) => [p.id, p.at.getTime(), p.title, p.body]))
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const ours = scheduled.filter((s) => !s.identifier.endsWith(SNOOZE_SUFFIX) && s.identifier !== TEST_ID)
  if (signature === readPref('notifySignature', '') && ours.length === plan.length) return plan

  await Promise.all(ours.map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)))
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: contentFor(n),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: REMINDER_CHANNEL },
    })
  }
  writePref('notifySignature', signature)
  return plan
}

/** "הזכר לי מחר": the same alert again tomorrow at the alert time. */
export async function snooze(request: Notifications.NotificationRequest, time: string): Promise<void> {
  const [hh, mm] = time.split(':').map(Number)
  const at = new Date()
  at.setDate(at.getDate() + 1)
  at.setHours(hh || 8, mm || 0, 0, 0)
  const base = request.identifier.replace(SNOOZE_SUFFIX, '')
  await Notifications.scheduleNotificationAsync({
    identifier: `${base}${SNOOZE_SUFFIX}`,
    content: {
      title: request.content.title ?? 'תזכורת',
      body: request.content.body ?? '',
      data: request.content.data,
      categoryIdentifier: request.content.categoryIdentifier ?? 'reminder',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: REMINDER_CHANNEL },
  })
}

/** "בוצע" on a custom reminder. */
export async function markCustomDone(carId: string, customId: string): Promise<void> {
  const ref = doc(getFirestore(), 'cars', carId, 'reminders', customId)
  const snap = await getDoc(ref)
  const rec = snap.data() as CustomReminder | undefined
  if (rec) await commit(setDoc(ref, { ...rec, done: true, doneAt: todayISO(), updatedAt: Date.now() }))
}

/** A local notification in a few seconds — works with the app closed. */
export async function sendLocalTest(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ID,
    content: { title: 'Car360 · בדיקה', body: 'התראת ניסיון מהטלפון. אם אתם רואים אותה — זה עובד 🎉', data: { url: '/notifications' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: REMINDER_CHANNEL },
  })
}

/**
 * Stores this device's FCM token under the user, so the server can push to it
 * (changes made on another device, cars shared with you). Also records the
 * email, which is how the server finds the people a car is shared with.
 */
export async function registerPushToken(user: { uid: string; email: string; displayName: string }): Promise<string | null> {
  const { data: token } = await Notifications.getDevicePushTokenAsync()
  if (typeof token !== 'string' || !token) return null
  const db = getFirestore()
  const now = Date.now()
  await setDoc(
    doc(db, 'users', user.uid, 'fcmTokens', token),
    { platform: 'android', device: DeviceHealth.manufacturer(), updatedAt: now },
    { merge: true },
  )
  await setDoc(doc(db, 'users', user.uid), { email: user.email.toLowerCase(), displayName: user.displayName }, { merge: true })
  writePref('pushToken', token)
  return token
}
