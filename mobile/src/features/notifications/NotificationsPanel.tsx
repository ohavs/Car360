import { useRouter } from 'expo-router'
import { BellOff, BellRing, Stethoscope } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { LEAD_OPTIONS, PREF_LABELS } from '@shared/notifyPrefs'
import { space } from '../../theme/tokens'
import { Card, ListItem, SectionHeader, Select, TimeField } from '../../ui'
import { useNotifications } from './NotificationsProvider'

const OPTIONS = LEAD_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))

/** Settings: how far ahead to alert per type, at what time, and the check-up. */
export function NotificationsPanel() {
  const { permission, requestPermission, prefs, setPrefs, time, setTime, scheduledCount } = useNotifications()
  const router = useRouter()

  return (
    <View>
      <SectionHeader title="התראות" />
      <Card padded={false}>
        {permission === 'granted' ? (
          <ListItem
            icon={BellRing}
            title="ההתראות פעילות"
            subtitle={scheduledCount ? `${scheduledCount} התראות מתוזמנות ב-60 הימים הקרובים` : 'אין כרגע התראות מתוזמנות'}
          />
        ) : (
          <ListItem
            icon={BellOff}
            tone="danger"
            title="ההתראות כבויות"
            subtitle="הקישו כדי לאפשר — אחרת לא נוכל להזכיר לכם"
            onPress={() => void (permission === 'denied' ? router.push('/notifications') : requestPermission())}
          />
        )}
        <ListItem
          icon={Stethoscope}
          title="בדיקת התראות"
          subtitle="למה לא קיבלתי התראה? בדיקה ותיקון"
          onPress={() => router.push('/notifications')}
        />
      </Card>
      <Card style={styles.prefs}>
        <TimeField label="שעת ההתראה" value={time} onChange={(t) => setTime(t || time)} hint="תזכורת עם שעה משלה תקפוץ בשעה שלה" />
        {PREF_LABELS.map(({ key, label }) => (
          <Select
            key={key}
            label={label}
            value={String(prefs[key])}
            options={OPTIONS}
            onChange={(v) => setPrefs({ ...prefs, [key]: Number(v) })}
          />
        ))}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  prefs: { gap: space.lg, marginTop: space.md },
})
