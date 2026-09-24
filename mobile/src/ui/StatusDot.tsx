import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { StatusTone } from './feedback'

/** Status in a line of text (the chip's quiet sibling): a small coloured dot. */
export function StatusDot({ tone }: { tone: StatusTone }) {
  const { colors } = useTheme()
  const color = { neutral: colors.muted, ok: colors.success, warn: colors.warning, danger: colors.danger }[tone]
  return <View style={[styles.dot, { backgroundColor: color }]} />
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
})
