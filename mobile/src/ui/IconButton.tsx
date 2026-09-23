import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius, TOUCH } from '../theme/tokens'
import { Touchable } from './Pressable'

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tonal = false,
  badge = false,
  style,
}: {
  icon: LucideIcon
  /** read by TalkBack — icon-only buttons always need one */
  label: string
  onPress: () => void
  /** filled circle instead of a bare icon */
  tonal?: boolean
  /** small dot, e.g. "an update is waiting" */
  badge?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      borderless={!tonal}
      style={[styles.base, tonal && { backgroundColor: colors.surfaceContainer }, style]}
    >
      <Icon size={22} color={colors.onSurface} strokeWidth={1.9} />
      {badge && <View style={[styles.badge, { backgroundColor: colors.brand, borderColor: colors.background }]} />}
    </Touchable>
  )
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    end: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
})
