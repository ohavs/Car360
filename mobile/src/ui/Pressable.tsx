import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable)

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  /** ripple tint; defaults to the text colour of the surface it sits on */
  rippleColor?: string
  /** ripple that spreads beyond the bounds (icon buttons) */
  borderless?: boolean
  /**
   * How a press shows:
   * - ripple: the Android ink, for rows and buttons
   * - scale: the thing itself sinks a little — for cards, images, tiles,
   *   where a ripple would paint a rectangle over them
   * - none: no visual (the target shows its own state, e.g. tabs)
   */
  feedback?: 'ripple' | 'scale' | 'none'
}

/** Every tappable thing goes through here, so every one of them answers a
 *  touch the same way, in the theme's colours — never the grey default. */
export function Touchable({ feedback = 'ripple', ...props }: TouchableProps) {
  if (feedback === 'scale') return <ScaleTouchable {...props} />
  const { style, rippleColor, borderless = false, disabled, ...rest } = props
  return (
    <RippleTouchable
      style={style}
      rippleColor={rippleColor}
      borderless={borderless}
      disabled={disabled}
      ripple={feedback === 'ripple'}
      {...rest}
    />
  )
}

function RippleTouchable({
  style,
  rippleColor,
  borderless = false,
  disabled,
  ripple,
  ...props
}: Omit<TouchableProps, 'feedback'> & { ripple: boolean }) {
  const { dark } = useTheme()
  const color = rippleColor ?? (dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)')
  return (
    <RNPressable
      android_ripple={disabled || !ripple ? undefined : { color, borderless, foreground: true }}
      disabled={disabled}
      style={[{ overflow: borderless ? 'visible' : 'hidden' }, style]}
      {...props}
    />
  )
}

function ScaleTouchable({
  style,
  onPressIn,
  onPressOut,
  disabled,
  rippleColor: _rippleColor,
  borderless: _borderless,
  ...props
}: Omit<TouchableProps, 'feedback'>) {
  const pressed = useSharedValue(0)
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.035 }],
    opacity: 1 - pressed.value * 0.08,
  }))
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: 90 })
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, { damping: 14, stiffness: 320 })
        onPressOut?.(e)
      }}
      style={[style, animated]}
      {...props}
    />
  )
}
