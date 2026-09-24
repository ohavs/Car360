import { PartyPopper } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, Sheet, Text } from '../../ui'

/** Once, right after an update: the version and what changed in it. */
export function WhatsNewSheet({ version, notes, onClose }: { version: string; notes: string[]; onClose: () => void }) {
  const { colors } = useTheme()
  return (
    <Sheet visible onClose={onClose}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: colors.brandContainer }]}>
          <PartyPopper size={30} color={colors.brand} strokeWidth={2} />
        </View>
        <Text variant="headline" align="center">
          מה חדש ב-{version}
        </Text>
      </View>
      <View style={styles.list}>
        {notes.map((n, i) => (
          <View key={i} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: colors.brand }]} />
            <Text variant="body" style={styles.flex}>
              {n}
            </Text>
          </View>
        ))}
      </View>
      <Button label="מעולה" size="large" onPress={onClose} />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space.md, paddingTop: space.sm },
  icon: { width: 64, height: 64, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  list: { gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  flex: { flex: 1 },
})
