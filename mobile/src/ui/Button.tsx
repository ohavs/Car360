import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

export type ButtonVariant = 'filled' | 'brand' | 'tonal' | 'outlined' | 'text' | 'danger'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  icon?: LucideIcon
  /** shows a spinner in place of the label and keeps the width */
  loading?: boolean
  disabled?: boolean
  size?: 'regular' | 'large'
  style?: StyleProp<ViewStyle>
  accessibilityHint?: string
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  icon: Icon,
  loading = false,
  disabled = false,
  size = 'regular',
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme()

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    filled: { bg: colors.primary, fg: colors.onPrimary },
    brand: { bg: colors.brand, fg: colors.onBrand },
    tonal: { bg: colors.surfaceContainer, fg: colors.onSurface },
    outlined: { bg: 'transparent', fg: colors.onSurface, border: colors.outline },
    text: { bg: 'transparent', fg: colors.brand },
    danger: { bg: colors.danger, fg: colors.onDanger },
  }
  const { bg, fg, border } = palette[variant]
  const inactive = disabled || loading

  return (
    <Touchable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      rippleColor={variant === 'filled' || variant === 'brand' || variant === 'danger' ? 'rgba(255,255,255,0.22)' : undefined}
      style={[
        styles.base,
        size === 'large' && styles.large,
        { backgroundColor: bg, borderColor: border ?? 'transparent', borderWidth: border ? 1 : 0 },
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {Icon && <Icon size={20} color={fg} strokeWidth={2.2} />}
            <Text variant="bodyStrong" style={{ color: fg }} numberOfLines={1}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Touchable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.full,
    paddingHorizontal: space.xxl,
    justifyContent: 'center',
  },
  large: {
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  disabled: {
    opacity: 0.4,
  },
})
