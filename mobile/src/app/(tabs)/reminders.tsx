import { useRouter } from 'expo-router'
import { Bell, BellOff, BellPlus, Car, Check, CheckCircle2, FileText, Shield, Wrench, type LucideIcon } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car as CarModel, CustomReminder, DerivedReminder } from '@shared/types'
import { dueLabel, dueStatus, formatDate, todayISO } from '@shared/utils'
import { useGarage } from '../../data/CarsProvider'
import { saveRecord } from '../../data/mutations'
import { useReminders } from '../../data/RemindersProvider'
import { useNotifications } from '../../features/notifications/NotificationsProvider'
import { ReminderSheet } from '../../features/reminders/ReminderSheet'
import { useReminderOpener } from '../../features/reminders/useReminderOpener'
import { useTheme } from '../../theme/ThemeProvider'
import { badge, icon, radius, space } from '../../theme/tokens'
import {
  AppBar,
  Appear,
  Button,
  Card,
  CarThumb,
  EmptyState,
  FAB,
  ListItem,
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

const setDone = (r: CustomReminder, done: boolean) =>
  saveRecord('reminders', { ...r, done, doneAt: done ? todayISO() : undefined, updatedAt: Date.now() })

export default function RemindersScreen() {
  const { cars, loading: carsLoading, activeCar } = useGarage()
  const { reminders, customs, loading } = useReminders()
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
      snack(`"${custom.title}" סומן כבוצע`, {
        tone: 'success',
        action: { label: 'ביטול', onPress: () => void setDone(custom, false) },
      })
    } catch {
      snack('העדכון נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }
  const finished = useMemo(
    () =>
      customs
        .filter((c) => c.done)
        .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '') || b.updatedAt - a.updatedAt)
        .slice(0, 10),
    [customs],
  )
  const carOf = (id: string) => cars.find((c) => c.id === id)
  const carName = (id: string) => {
    const car = cars.find((c) => c.id === id)
    return car ? carDisplayName(car) : ''
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
                  car={cars.find((c) => c.id === r.carId)}
                  onPress={() => opener.openReminder(r)}
                  onDone={r.source === 'custom' ? () => void markDone(r) : () => opener.openReminder(r)}
                />
              ))}
            </Card>
          </Appear>
        ))
      )}
      {finished.length > 0 && !(carsLoading || loading) && (
        <Appear index={groups.length} style={styles.stack}>
          <SectionHeader title="בוצעו לאחרונה" />
          <Card padded={false}>
            {finished.map((c) => (
              <ListItem
                key={`${c.carId}:${c.id}`}
                leading={<CarThumb uri={carOf(c.carId)?.imageUrl} kind={carOf(c.carId)?.imageKind} badge={CheckCircle2} />}
                overline={carName(c.carId)}
                title={c.title}
                subtitle={c.doneAt ? `בוצע ב-${formatDate(c.doneAt)}` : 'בוצע'}
                onPress={() => setEditing(c)}
              />
            ))}
          </Card>
        </Appear>
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

/** A reminder is a regular list row: its status chip and a ✓ at the end. */
function ReminderRow({
  reminder: r,
  car,
  onPress,
  onDone,
}: {
  reminder: DerivedReminder
  car?: CarModel
  onPress: () => void
  onDone?: () => void
}) {
  const { colors } = useTheme()
  const { icon: Icon, label } = SOURCE[r.source]
  return (
    <ListItem
      leading={<CarThumb uri={car?.imageUrl ?? r.carImage} kind={car?.imageKind} badge={Icon} />}
      overline={r.carName}
      title={r.title}
      titleLines={2}
      subtitle={`${formatDate(r.dueDate)}${r.time ? ` · ${r.time}` : ''} · ${label}`}
      onPress={onPress}
      trailing={
        <View style={styles.trailing}>
          <StatusChip tone={dueStatus(r.dueDate)} label={dueLabel(r.dueDate)} />
          {onDone && (
            <Touchable
              borderless
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel={`סימון "${r.title}" כבוצע`}
              style={[styles.done, { borderColor: colors.outline }]}
            >
              <Check size={icon.sm} color={colors.success} strokeWidth={2.6} />
            </Touchable>
          )}
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  done: {
    width: badge.sm,
    height: badge.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
