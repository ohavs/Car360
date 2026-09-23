import { useRouter } from 'expo-router'
import { Bell, BellOff, BellPlus, Car, Check, FileText, Shield, Wrench, type LucideIcon } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CustomReminder, DerivedReminder } from '@shared/types'
import { dueLabel, dueStatus, formatDate } from '@shared/utils'
import { useGarage } from '../../data/CarsProvider'
import { saveRecord } from '../../data/mutations'
import { useAllReminders } from '../../data/reminders'
import { useNotifications } from '../../features/notifications/NotificationsProvider'
import { ReminderSheet } from '../../features/reminders/ReminderSheet'
import { useReminderOpener } from '../../features/reminders/useReminderOpener'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import {
  AppBar,
  Appear,
  Button,
  Card,
  EmptyState,
  FAB,
  Screen,
  SectionHeader,
  Skeleton,
  StatusChip,
  Text,
  Touchable,
  useSnackbar,
} from '../../ui'

const SOURCE: Record<DerivedReminder['source'], { label: string; icon: LucideIcon }> = {
  test: { label: 'טסט', icon: Car },
  license: { label: 'רישיון', icon: FileText },
  insurance: { label: 'ביטוח', icon: Shield },
  service: { label: 'טיפול', icon: Wrench },
  block: { label: 'מותאם אישית', icon: Bell },
  custom: { label: 'תזכורת', icon: Bell },
}

/** Everything that is coming up, across all cars, in the order it matters. */
const GROUPS: { title: string; test: (d: number) => boolean }[] = [
  { title: 'באיחור', test: (d) => d < 0 },
  { title: 'השבוע', test: (d) => d >= 0 && d <= 7 },
  { title: 'החודש', test: (d) => d > 7 && d <= 30 },
  { title: 'בהמשך', test: (d) => d > 30 },
]

const setDone = (r: CustomReminder, done: boolean) => saveRecord('reminders', { ...r, done, updatedAt: Date.now() })

export default function RemindersScreen() {
  const { cars, loading: carsLoading, activeCar } = useGarage()
  const { reminders, customs, loading } = useAllReminders(cars)
  const router = useRouter()
  const snack = useSnackbar()
  const { permission, canAsk, requestPermission } = useNotifications()
  const { colors } = useTheme()
  // null: closed · 'new' · a reminder to edit
  const [editing, setEditing] = useState<CustomReminder | 'new' | null>(null)
  const customOf = (r: DerivedReminder) => customs.find((c) => c.id === r.customId && c.carId === r.carId)

  const opener = useReminderOpener(cars, customs, activeCar?.id)

  const markDone = async (r: DerivedReminder) => {
    const custom = customOf(r)
    if (!custom) return
    try {
      await setDone(custom, true)
      snack(`"${custom.title}" סומנה כבוצעה`, {
        tone: 'success',
        action: { label: 'ביטול', onPress: () => void setDone(custom, false) },
      })
    } catch {
      snack('העדכון נכשל', { tone: 'error' })
    }
  }
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: reminders.filter((r) => g.test(r.daysLeft)) })).filter((g) => g.items.length),
    [reminders],
  )

  return (
    <Screen
      header={<AppBar title="תזכורות" subtitle="טסט, ביטוחים, טיפולים — הכל במקום אחד" />}
      fab={cars.length > 0 ? <FAB icon={BellPlus} label="תזכורת חדשה" onPress={() => setEditing('new')} /> : undefined}
    >
      {permission !== 'granted' && (
        <Card onPress={() => void (canAsk ? requestPermission() : router.push('/notifications'))} accessibilityLabel="הפעלת התראות">
          <View style={styles.offRow}>
            <BellOff size={20} color={colors.danger} strokeWidth={2} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">ההתראות כבויות</Text>
              <Text variant="caption" tone="muted">
                התזכורות מופיעות כאן, אבל לא יקפצו בטלפון. הקישו להפעלה.
              </Text>
            </View>
          </View>
        </Card>
      )}
      {carsLoading || loading ? (
        <View style={styles.stack}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={radius.card} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="אין תזכורות"
          subtitle="תאריכי טסט, ביטוח וטיפולים יופיעו כאן אוטומטית. אפשר גם להוסיף תזכורת משלכם."
          action={cars.length > 0 ? <Button label="תזכורת חדשה" icon={BellPlus} onPress={() => setEditing('new')} /> : undefined}
        />
      ) : (
        groups.map((g, i) => (
          <Appear key={g.title} index={i} style={styles.stack}>
            <SectionHeader title={`${g.title} · ${g.items.length}`} />
            <Card padded={false}>
              {g.items.map((r) => (
                <ReminderRow
                  key={r.key}
                  reminder={r}
                  onPress={() => opener.openReminder(r)}
                  onDone={r.source === 'custom' ? () => void markDone(r) : undefined}
                />
              ))}
            </Card>
          </Appear>
        ))
      )}
      {opener.sheet}
      {editing && (
        <ReminderSheet
          cars={cars}
          defaultCarId={activeCar?.id}
          reminder={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  )
}

function ReminderRow({ reminder: r, onPress, onDone }: { reminder: DerivedReminder; onPress: () => void; onDone?: () => void }) {
  const { colors } = useTheme()
  const { icon: Icon, label } = SOURCE[r.source]
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${r.title}, ${dueLabel(r.dueDate)}`} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}>
        <Icon size={20} color={colors.onSurface} strokeWidth={1.9} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {r.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {r.carName} · {formatDate(r.dueDate)}
          {r.time ? ` · ${r.time}` : ''} · {label}
        </Text>
      </View>
      <StatusChip tone={dueStatus(r.dueDate)} label={dueLabel(r.dueDate)} />
      {onDone && (
        <Touchable
          borderless
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={`סימון "${r.title}" כבוצע`}
          style={[styles.done, { borderColor: colors.outline }]}
        >
          <Check size={18} color={colors.success} strokeWidth={2.4} />
        </Touchable>
      )}
    </Touchable>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 68,
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  done: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
