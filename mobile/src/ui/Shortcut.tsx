import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { badge, icon, radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** One compact destination: a round icon and a short label. */
export function Shortcut({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Touchable feedback="scale" onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.shortcut}>
      <View style={[styles.badge, { backgroundColor: colors.surfaceContainer }]}>
        <Icon size={icon.lg} color={colors.onSurface} strokeWidth={1.9} />
      </View>
      <Text variant="overline" tone="onSurfaceVariant" numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  )
}

/** A single row of shortcuts, evenly spread. */
export function ShortcutRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  shortcut: { flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.xs },
  badge: { width: badge.lg, height: badge.lg, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
})
