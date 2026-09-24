import { StickyNote } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { Text } from './Text'

/** A record's free-text note, shown where the record is listed — never only
 *  inside its editor. */
export function NoteLine({ text, lines = 2 }: { text?: string; lines?: number }) {
  const { colors } = useTheme()
  const note = text?.trim()
  if (!note) return null
  return (
    <View style={styles.row}>
      <StickyNote size={13} color={colors.muted} strokeWidth={2} style={styles.icon} />
      <Text variant="caption" tone="onSurfaceVariant" numberOfLines={lines} style={styles.text}>
        {note}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  icon: { marginTop: 3 },
  text: { flex: 1 },
})
