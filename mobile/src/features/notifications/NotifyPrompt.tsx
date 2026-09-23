import { BellRing } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { readPref, writePref } from '../../lib/storage'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, Sheet, Text } from '../../ui'
import { useNotifications } from './NotificationsProvider'

/** Explains why before Android's permission dialog — asked once, when there
 *  is something worth reminding about. */
export function NotifyPrompt({ enabled }: { enabled: boolean }) {
  const { permission, canAsk, requestPermission } = useNotifications()
  const { colors } = useTheme()
  const [dismissed, setDismissed] = useState(() => readPref('notifyAsked', false))
  const visible = enabled && !dismissed && permission === 'undetermined' && canAsk

  const close = () => {
    writePref('notifyAsked', true)
    setDismissed(true)
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: colors.brandContainer }]}>
          <BellRing size={32} color={colors.brand} strokeWidth={2} />
        </View>
        <Text variant="headline" align="center">
          שלא תפספסו טסט
        </Text>
        <Text variant="body" tone="onSurfaceVariant" align="center">
          נזכיר לכם לפני שהטסט, הביטוח או הטיפול מגיעים — גם כשהאפליקציה סגורה ובלי אינטרנט. רק כשיש משהו להזכיר.
        </Text>
      </View>
      <Button
        label="לאפשר התראות"
        size="large"
        onPress={() => {
          close()
          void requestPermission()
        }}
      />
      <Button label="לא עכשיו" variant="text" onPress={close} />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.md, paddingTop: space.md },
  icon: { width: 72, height: 72, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
})
