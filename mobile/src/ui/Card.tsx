import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'

/** A surface. Solid (no blur — it costs frames on Android), with a hairline
 *  edge and a soft shadow, like the web app's "minimal" tiles. */
export function Card({
  children,
  onPress,
  padded = true,
  style,
  accessibilityLabel,
}: {
  children: ReactNode
  onPress?: () => void
  padded?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const { colors, dark } = useTheme()
  const surface: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    boxShadow: dark ? undefined : '0 1px 2px rgba(15,23,42,0.05), 0 10px 24px -16px rgba(15,23,42,0.35)',
  }
  const body = [styles.base, padded && styles.padded, surface, style]

  if (onPress) {
    return (
      <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={body}>
        {children}
      </Touchable>
    )
  }
  return <View style={body}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: space.lg,
  },
})
