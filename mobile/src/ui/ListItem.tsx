import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Colors } from '../theme/palettes'
import { badge, icon, radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** A settings-style row: leading icon, title and subtitle, trailing slot. The
 *  whole row is the touch target, never just the control at its end. */
export function ListItem({
  icon: Icon,
  leading,
  overline,
  title,
  subtitle,
  trailing,
  onPress,
  onLongPress,
  titleLines = 1,
  tone = 'onSurface',
}: {
  icon?: LucideIcon
  /** replaces the icon badge (e.g. the car's own picture) */
  leading?: ReactNode
  /** a short bold line above the title — e.g. which car the row is about */
  overline?: string
  title: string
  subtitle?: string
  trailing?: ReactNode
  onPress?: () => void
  /** the row's actions (edit, delete…) in a sheet */
  onLongPress?: () => void
  titleLines?: number
  tone?: keyof Colors
}) {
  const { colors } = useTheme()
  const body = (
    <>
      {leading}
      {!leading && Icon && (
        <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}>
          <Icon size={icon.md} color={colors[tone]} strokeWidth={1.9} />
        </View>
      )}
      <View style={styles.text}>
        {overline ? (
          <Text variant="label" tone="brand" numberOfLines={1} style={styles.overline}>
            {overline}
          </Text>
        ) : null}
        <Text variant="bodyStrong" tone={tone} numberOfLines={titleLines}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  )

  if (onPress || onLongPress) {
    return (
      <Touchable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={title} style={styles.row}>
        {body}
      </Touchable>
    )
  }
  return <View style={styles.row}>{body}</View>
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  icon: {
    width: badge.md,
    height: badge.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  overline: {
    fontWeight: '800',
  },
})
