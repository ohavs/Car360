import { useRouter } from 'expo-router'
import { Bell, Car, FileText, Shield, Wrench, type LucideIcon } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import type { DerivedReminder } from '@shared/types'
import { dueLabel, dueStatus, formatDate } from '@shared/utils'
import { useGarage } from '../../data/CarsProvider'
import { routeForReminder, useAllReminders } from '../../data/reminders'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { AppBar, Card, EmptyState, Screen, SectionHeader, Skeleton, StatusChip, Text, Touchable } from '../../ui'

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

export default function RemindersScreen() {
  const { cars, loading: carsLoading } = useGarage()
  const { reminders, loading } = useAllReminders(cars)
  const router = useRouter()
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: reminders.filter((r) => g.test(r.daysLeft)) })).filter((g) => g.items.length),
    [reminders],
  )

  return (
    <Screen header={<AppBar title="תזכורות" subtitle="טסט, ביטוחים, טיפולים — הכל במקום אחד" />}>
      {carsLoading || loading ? (
        <View style={styles.stack}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={radius.card} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <EmptyState icon={Bell} title="אין תזכורות" subtitle="הוסיפו תאריכי טסט וביטוח לרכבים — והם יופיעו כאן אוטומטית" />
      ) : (
        groups.map((g) => (
          <View key={g.title} style={styles.stack}>
            <SectionHeader title={`${g.title} · ${g.items.length}`} />
            <Card padded={false}>
              {g.items.map((r) => (
                <ReminderRow key={r.key} reminder={r} onPress={() => router.push(routeForReminder(r) as never)} />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  )
}

function ReminderRow({ reminder: r, onPress }: { reminder: DerivedReminder; onPress: () => void }) {
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
