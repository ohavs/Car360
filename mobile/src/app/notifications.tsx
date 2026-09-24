import { getFunctions, httpsCallable } from '@react-native-firebase/functions'
import * as Notifications from 'expo-notifications'
import {
  BatteryCharging,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Send,
  Smartphone,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { formatDate } from '@shared/utils'
import Constants from 'expo-constants'
import DeviceHealth from '../../modules/device-health'
import { REMINDER_CHANNEL, sendLocalTest } from '../features/notifications/engine'
import { useNotifications } from '../features/notifications/NotificationsProvider'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { AppBar, Button, Card, ListItem, Screen, SectionHeader, Text, useSnackbar } from '../ui'

/** the server half (Cloud Function) is live — see app.config extra.serverPush */
const SERVER_PUSH = Constants.expoConfig?.extra?.serverPush === true

interface Health {
  channelOn: boolean
  exact: boolean
  battery: boolean
  vendor: string
}

function readHealth(): Promise<Health> {
  return Notifications.getNotificationChannelAsync(REMINDER_CHANNEL).then((ch) => ({
    channelOn: !ch || ch.importance > Notifications.AndroidImportance.NONE,
    exact: DeviceHealth.canScheduleExactAlarms(),
    battery: DeviceHealth.isIgnoringBatteryOptimizations(),
    vendor: DeviceHealth.manufacturer(),
  }))
}

const VENDOR_TIP: Record<string, string> = {
  samsung: 'בסמסונג: הגדרות ← סוללה ← הגבלות שימוש ברקע ← לוודא ש-Car360 לא ברשימת "אפליקציות במצב שינה".',
  xiaomi: 'בשיאומי: הגדרות ← אפליקציות ← Car360 ← חיסכון בסוללה ← "ללא הגבלות", וגם להפעיל "הפעלה אוטומטית".',
  redmi: 'בשיאומי: הגדרות ← אפליקציות ← Car360 ← חיסכון בסוללה ← "ללא הגבלות", וגם להפעיל "הפעלה אוטומטית".',
  huawei: 'בהואווי: הגדרות ← סוללה ← הפעלת אפליקציות ← Car360 ← ניהול ידני, ולהפעיל את שלושת המתגים.',
  oneplus: 'בוואנפלוס: הגדרות ← סוללה ← אופטימיזציית סוללה ← Car360 ← "אל תבצע אופטימיזציה".',
}

const pad = (n: number) => String(n).padStart(2, '0')
const whenText = (at: Date) =>
  `${formatDate(`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`)} בשעה ${pad(at.getHours())}:${pad(at.getMinutes())}`

/** "Why didn't I get a notification?" — every condition, with a fix for each. */
export default function NotificationsHealthScreen() {
  const { permission, canAsk, requestPermission, scheduledCount, next, pushToken, retryPushToken, refresh } = useNotifications()
  const snack = useSnackbar()
  const [health, setHealth] = useState<Health | null>(null)
  const [sending, setSending] = useState<'local' | 'server' | null>(null)

  const reload = useCallback(() => {
    void refresh()
    void readHealth().then(setHealth)
  }, [refresh])

  // re-check when coming back from a system settings screen
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void readHealth().then(setHealth)
    })
    return () => sub.remove()
  }, [])
  useEffect(() => {
    void readHealth().then(setHealth)
  }, [permission])

  const allowed = permission === 'granted'

  const serverTest = async () => {
    setSending('server')
    try {
      const res = await httpsCallable<unknown, { sent: number }>(getFunctions(undefined, 'us-central1'), 'sendTestPush')()
      snack(res.data.sent ? 'נשלחה התראה מהשרת — היא אמורה להגיע תוך כמה שניות' : 'השרת לא מצא את הטלפון הזה — נסו "רישום מחדש" למעלה', {
        tone: res.data.sent ? 'success' : 'error',
      })
    } catch {
      snack('השרת לא זמין — ההתראות מהטלפון ממשיכות לעבוד', { tone: 'error' })
    } finally {
      setSending(null)
    }
  }

  const tip = health ? VENDOR_TIP[health.vendor] : undefined

  return (
    <Screen
      header={<AppBar title="בדיקת התראות" subtitle="כל מה שצריך כדי שתזכורת תקפוץ בזמן" back />}
      refreshing={false}
      onRefresh={reload}
    >
      {next ? (
        <Card style={styles.next}>
          <Text variant="caption" tone="muted">
            ההתראה הבאה
          </Text>
          <Text variant="title">{next.title}</Text>
          <Text variant="body" tone="onSurfaceVariant">
            {next.body} · {whenText(next.at)}
          </Text>
        </Card>
      ) : null}

      <SectionHeader title="בטלפון הזה" />
      <Card padded={false}>
        <Check
          icon={Bell}
          ok={allowed}
          title="הרשאת התראות"
          okText="מאושרת"
          badText={canAsk ? 'עדיין לא אושרה' : 'נחסמה — צריך לאשר בהגדרות'}
          fixLabel="לאשר"
          onFix={() => void (canAsk ? requestPermission() : DeviceHealth.openNotificationSettings())}
        />
        <Check
          icon={BellRing}
          ok={health?.channelOn ?? true}
          title='ערוץ "תזכורות"'
          okText="פעיל"
          badText="כבוי בהגדרות המערכת"
          fixLabel="להפעיל"
          onFix={() => DeviceHealth.openChannelSettings(REMINDER_CHANNEL)}
        />
        <Check
          icon={Timer}
          ok={health?.exact ?? true}
          title="התראות בשעה המדויקת"
          okText="מאושר"
          badText="אנדרואיד עלול לאחר התראות"
          fixLabel="לאשר"
          onFix={() => DeviceHealth.openExactAlarmSettings()}
        />
        <Check
          icon={BatteryCharging}
          ok={health?.battery ?? true}
          title="אופטימיזציית סוללה"
          okText="Car360 מוחרגת"
          badText="הטלפון עלול לעכב תזכורות"
          fixLabel="להחריג"
          onFix={() => DeviceHealth.requestIgnoreBatteryOptimizations()}
        />
        <ListItem
          icon={CalendarClock}
          title={scheduledCount ? `${scheduledCount} התראות מתוזמנות` : 'אין התראות מתוזמנות'}
          subtitle="ב-60 הימים הקרובים, לפי ההגדרות שבחרתם"
        />
      </Card>
      {tip && !health?.battery ? (
        <Text variant="caption" tone="onSurfaceVariant">
          {tip}
        </Text>
      ) : null}

      {SERVER_PUSH && <SectionHeader title="מהשרת" />}
      {SERVER_PUSH && (
        <Card padded={false}>
          <Check
            icon={Cloud}
            ok={Boolean(pushToken)}
            title="הטלפון רשום לקבלת התראות"
            okText="לשינויים ממכשיר אחר ולרכבים משותפים"
            badText={allowed ? 'הרישום עוד לא הושלם' : 'יתאפשר אחרי אישור ההתראות'}
            fixLabel="רישום מחדש"
            onFix={
              allowed
                ? () =>
                    void retryPushToken().then((ok) =>
                      snack(ok ? 'הטלפון נרשם' : 'הרישום נכשל — בדקו את החיבור ונסו שוב', { tone: ok ? 'success' : 'error' }),
                    )
                : undefined
            }
          />
        </Card>
      )}

      <SectionHeader title="ניסיון" />
      <View style={styles.tests}>
        <Button
          label="התראת ניסיון מהטלפון"
          icon={Smartphone}
          variant="tonal"
          disabled={!allowed}
          loading={sending === 'local'}
          onPress={() => {
            setSending('local')
            void sendLocalTest()
              .then(() => snack('ההתראה תקפוץ בעוד 5 שניות — אפשר לסגור את האפליקציה', { tone: 'info' }))
              .finally(() => setSending(null))
          }}
        />
        {SERVER_PUSH && (
          <Button
            label="התראת ניסיון מהשרת"
            icon={Send}
            variant="outlined"
            disabled={!allowed || !pushToken}
            loading={sending === 'server'}
            onPress={() => void serverTest()}
          />
        )}
      </View>
    </Screen>
  )
}

function Check({
  icon,
  ok,
  title,
  okText,
  badText,
  fixLabel,
  onFix,
}: {
  icon: LucideIcon
  ok: boolean
  title: string
  okText: string
  badText: string
  fixLabel: string
  onFix?: () => void
}) {
  const { colors } = useTheme()
  const Status = ok ? CheckCircle2 : XCircle
  return (
    <ListItem
      icon={icon}
      title={title}
      subtitle={ok ? okText : badText}
      onPress={!ok ? onFix : undefined}
      trailing={
        ok ? (
          <Status size={22} color={colors.success} strokeWidth={2.2} />
        ) : onFix ? (
          <View style={[styles.fix, { backgroundColor: colors.dangerContainer }]}>
            <Text variant="label" tone="danger">
              {fixLabel}
            </Text>
          </View>
        ) : (
          <Status size={22} color={colors.danger} strokeWidth={2.2} />
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  next: { gap: space.xs },
  tests: { gap: space.sm },
  fix: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.full },
})
