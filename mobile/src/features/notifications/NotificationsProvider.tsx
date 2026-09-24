import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { DEFAULT_NOTIF_PREFS, DEFAULT_NOTIFY_TIME, type NotificationPrefs } from '@shared/notifyPrefs'
import type { PlannedNotification } from '@shared/notifySchedule'
import { useReminders } from '../../data/RemindersProvider'
import { readPref, writePref } from '../../lib/storage'
import { useAuth } from '../auth/AuthProvider'
import { ensureChannels, markCustomDone, registerPushToken, reschedule, snooze } from './engine'

export type Permission = 'granted' | 'denied' | 'undetermined'

interface NotificationsState {
  permission: Permission
  /** Android can still ask (false once the user said no twice) */
  canAsk: boolean
  requestPermission: () => Promise<Permission>
  prefs: NotificationPrefs
  setPrefs: (prefs: NotificationPrefs) => void
  time: string
  setTime: (time: string) => void
  scheduledCount: number
  /** the soonest reminder alert on this phone */
  next: PlannedNotification | null
  pushToken: string | null
  retryPushToken: () => Promise<boolean>
  /** re-read permission and alarms (after returning from system settings) */
  refresh: () => Promise<void>
}

const Ctx = createContext<NotificationsState | null>(null)

/**
 * Keeps the phone's alarms matching the reminders: on launch, on every data
 * or preference change (debounced), and whenever the app comes back to the
 * foreground. Also handles taps and the buttons on a notification.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { reminders, loading } = useReminders()
  const router = useRouter()

  const [permission, setPermission] = useState<Permission>('undetermined')
  const [canAsk, setCanAsk] = useState(true)
  const [prefs, setPrefsState] = useState<NotificationPrefs>(() => ({ ...DEFAULT_NOTIF_PREFS, ...readPref('notifyPrefs', {}) }))
  const [time, setTimeState] = useState(() => readPref('notifyTime', DEFAULT_NOTIFY_TIME))
  const [plan, setPlan] = useState<PlannedNotification[]>([])
  const [pushToken, setPushToken] = useState<string | null>(() => readPref<string | null>('pushToken', null))
  const [foregroundTick, setForegroundTick] = useState(0)
  const timeRef = useRef(time)

  const readPermission = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync()
    setPermission(p.granted ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined')
    setCanAsk(p.canAskAgain)
    return p
  }, [])

  // channels first: on Android 13+ the permission prompt only appears once one exists
  useEffect(() => {
    void ensureChannels().then(readPermission)
  }, [readPermission])

  // preferences also live in the cloud, shared with the web app and the server
  useEffect(() => {
    if (!user) return
    void getDoc(doc(getFirestore(), 'users', user.uid)).then((snap) => {
      const data = snap.data() as { notifications?: Partial<NotificationPrefs>; notifyTime?: string } | undefined
      if (data?.notifications) {
        const next = { ...DEFAULT_NOTIF_PREFS, ...data.notifications }
        setPrefsState(next)
        writePref('notifyPrefs', next)
      }
      if (data?.notifyTime) {
        setTimeState(data.notifyTime)
        timeRef.current = data.notifyTime
        writePref('notifyTime', data.notifyTime)
      }
    }, () => {})
  }, [user])

  const setPrefs = useCallback(
    (next: NotificationPrefs) => {
      setPrefsState(next)
      writePref('notifyPrefs', next)
      if (user) void setDoc(doc(getFirestore(), 'users', user.uid), { notifications: next }, { merge: true }).catch(() => {})
    },
    [user],
  )

  const setTime = useCallback(
    (next: string) => {
      setTimeState(next)
      timeRef.current = next
      writePref('notifyTime', next)
      if (user) void setDoc(doc(getFirestore(), 'users', user.uid), { notifyTime: next }, { merge: true }).catch(() => {})
    },
    [user],
  )

  // the FCM token, once notifications are allowed
  useEffect(() => {
    if (!user || permission !== 'granted') return
    registerPushToken(user).then(setPushToken, () => {})
    const sub = Notifications.addPushTokenListener(() => void registerPushToken(user).then(setPushToken, () => {}))
    return () => sub.remove()
  }, [user, permission])

  // reschedule (debounced) whenever anything that affects it changes
  useEffect(() => {
    if (!user || loading) return
    const t = setTimeout(() => {
      reschedule(reminders, prefs, time).then(setPlan, () => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [user, loading, reminders, prefs, time, foregroundTick])

  // back from the background: a day may have passed, settings may have changed
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return
      void readPermission()
      setForegroundTick((n) => n + 1)
    })
    return () => sub.remove()
  }, [readPermission])

  // a tap on a notification (also the one that launched the app), and its buttons
  useEffect(() => {
    if (!user) return
    const handle = (response: Notifications.NotificationResponse) => {
      const { request } = response.notification
      const data = (request.content.data ?? {}) as { url?: string; customId?: string | null; carId?: string }
      void Notifications.dismissNotificationAsync(request.identifier).catch(() => {})
      if (response.actionIdentifier === 'snooze') {
        void snooze(request, timeRef.current)
        return
      }
      if (response.actionIdentifier === 'done' && data.customId && data.carId) {
        void markCustomDone(data.carId, data.customId)
        return
      }
      if (data.url) router.push(data.url as never)
    }
    // the notification that launched the app: wait for the first screen to mount
    const last = Notifications.getLastNotificationResponse()
    const coldStart = last
      ? setTimeout(() => {
          handle(last)
          Notifications.clearLastNotificationResponse()
        }, 400)
      : undefined
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handle(r)
      Notifications.clearLastNotificationResponse()
    })
    return () => {
      clearTimeout(coldStart)
      sub.remove()
    }
  }, [user, router])

  // signed out: this phone should stop ringing for that account
  const hadUser = useRef(false)
  useEffect(() => {
    if (user) {
      hadUser.current = true
      return
    }
    if (!hadUser.current) return
    hadUser.current = false
    writePref('notifySignature', '')
    void Notifications.cancelAllScheduledNotificationsAsync()
  }, [user])

  const requestPermission = useCallback(async () => {
    await Notifications.requestPermissionsAsync()
    const p = await readPermission()
    writePref('notifyAsked', true)
    return p.granted ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined'
  }, [readPermission])

  const retryPushToken = useCallback(async () => {
    if (!user) return false
    try {
      const token = await registerPushToken(user)
      setPushToken(token)
      return Boolean(token)
    } catch {
      return false
    }
  }, [user])

  const refresh = useCallback(async () => {
    await readPermission()
    setForegroundTick((n) => n + 1)
  }, [readPermission])

  const value = useMemo<NotificationsState>(
    () => ({
      permission,
      canAsk,
      requestPermission,
      prefs,
      setPrefs,
      time,
      setTime,
      scheduledCount: plan.length,
      next: plan[0] ?? null,
      pushToken,
      retryPushToken,
      refresh,
    }),
    [permission, canAsk, requestPermission, prefs, setPrefs, time, setTime, plan, pushToken, retryPushToken, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
