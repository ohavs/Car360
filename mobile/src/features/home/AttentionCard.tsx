import { useRouter } from 'expo-router'
import { CheckCircle2, ChevronLeft, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import type { DerivedReminder } from '@shared/types'
import { dueLabel } from '@shared/utils'
import { routeForReminder } from '../../data/reminders'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Card, Text, Touchable } from '../../ui'

/** The first answer on the home screen: what needs action, most urgent first.
 *  A single quiet line when nothing is due. */
export function AttentionCard({ reminders, max = 3 }: { reminders: DerivedReminder[]; max?: number }) {
  const { colors } = useTheme()
  const router = useRouter()
  const due = reminders.filter((r) => r.daysLeft <= 30)

  if (due.length === 0) {
    return (
      <View style={[styles.allGood, { backgroundColor: colors.successContainer }]}>
        <CheckCircle2 size={18} color={colors.success} strokeWidth={2.2} />
        <Text variant="label" tone="success">
          הכל מסודר — אין מה שדורש טיפול
        </Text>
      </View>
    )
  }

  const worst = due[0].daysLeft
  const tone = worst <= 7 ? colors.danger : colors.warning
  return (
    <Card padded={false}>
      <View style={styles.header}>
        <TriangleAlert size={18} color={tone} strokeWidth={2.2} />
        <Text variant="bodyStrong" style={styles.flex}>
          דורש טיפול
        </Text>
        <Text variant="label" tone="muted">
          {due.length}
        </Text>
      </View>
      {due.slice(0, max).map((r) => (
        <Touchable
          key={r.key}
          onPress={() => router.push(routeForReminder(r) as never)}
          accessibilityRole="button"
          accessibilityLabel={`${r.title}, ${dueLabel(r.dueDate)}`}
          style={styles.row}
        >
          <View style={[styles.bar, { backgroundColor: r.daysLeft <= 7 ? colors.danger : colors.warning }]} />
          <View style={styles.flex}>
            <Text variant="label" numberOfLines={1}>
              {r.title}
            </Text>
            <Text variant="caption" tone={r.daysLeft < 0 ? 'danger' : 'muted'} numberOfLines={1}>
              {dueLabel(r.dueDate)}
            </Text>
          </View>
          <ChevronLeft size={18} color={colors.muted} />
        </Touchable>
      ))}
      {due.length > max && (
        <Touchable onPress={() => router.push('/reminders')} style={styles.more}>
          <Text variant="label" tone="brand" align="center">
            ועוד {due.length - max} — לכל התזכורות
          </Text>
        </Touchable>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  allGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  bar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  more: {
    paddingVertical: space.md,
  },
})
