import { useEffect, useState } from 'react'
import { Animated, StyleSheet, type DimensionValue } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius as radii } from '../theme/tokens'

/** Placeholder block shown while content loads, gently pulsing so a slow
 *  network reads as "on its way" rather than "empty". */
export function Skeleton({
  width = '100%',
  height,
  radius = radii.md,
}: {
  width?: DimensionValue
  height: number
  radius?: number
}) {
  const { colors } = useTheme()
  const [opacity] = useState(() => new Animated.Value(0.55))

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius: radius, backgroundColor: colors.surfaceContainer, opacity }]}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
})
