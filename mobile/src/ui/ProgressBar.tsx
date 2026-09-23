import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius } from '../theme/tokens'

/** Determinate progress, 0..1. */
export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme()
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { backgroundColor: colors.surfaceContainer }]}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.brand }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
})
