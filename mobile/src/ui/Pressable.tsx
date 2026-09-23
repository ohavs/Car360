import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  /** ripple tint; defaults to the text colour of the surface it sits on */
  rippleColor?: string
  /** ripple that spreads beyond the bounds (icon buttons) */
  borderless?: boolean
}

/** Every tappable thing goes through here, so every one of them gets the
 *  Android ripple in the theme's colour instead of the grey default. */
export function Touchable({ style, rippleColor, borderless = false, disabled, ...props }: TouchableProps) {
  const { dark } = useTheme()
  const color = rippleColor ?? (dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)')
  return (
    <RNPressable
      android_ripple={disabled ? undefined : { color, borderless, foreground: true }}
      disabled={disabled}
      style={[{ overflow: borderless ? 'visible' : 'hidden' }, style]}
      {...props}
    />
  )
}
