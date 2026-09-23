import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Colors } from '../theme/palettes'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** A settings-style row: leading icon, title and subtitle, trailing slot. The
 *  whole row is the touch target, never just the control at its end. */
export function ListItem({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onPress,
  tone = 'onSurface',
}: {
  icon?: LucideIcon
  title: string
  subtitle?: string
  trailing?: ReactNode
  onPress?: () => void
  tone?: keyof Colors
}) {
  const { colors } = useTheme()
  const body = (
    <>
      {Icon && (
        <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}>
          <Icon size={20} color={colors[tone]} strokeWidth={1.9} />
        </View>
      )}
      <View style={styles.text}>
        <Text variant="bodyStrong" tone={tone} numberOfLines={1}>
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

  if (onPress) {
    return (
      <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.row}>
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
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
})
