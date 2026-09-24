import type { ErrorBoundaryProps } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Copy, RotateCcw, TriangleAlert } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { crashText, readCrash, recordCrash } from '../../lib/crashLog'
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { Button, Text } from '../../ui'

/** What a screen that failed to render shows instead of closing the app. */
export function CrashScreen(props: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CrashBody {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function CrashBody({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [copied, setCopied] = useState(false)
  useEffect(() => recordCrash(error, false), [error])

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TriangleAlert size={40} color={colors.warning} strokeWidth={1.8} />
      <Text variant="title" align="center">
        משהו השתבש במסך הזה
      </Text>
      <Text tone="muted" align="center">
        הנתונים שלכם בטוחים. אפשר לנסות שוב, ואם זה חוזר — העתיקו את פרטי התקלה ושלחו אותם.
      </Text>
      <Button label="ניסיון חוזר" icon={RotateCcw} onPress={() => void retry()} />
      <Button
        label={copied ? 'הפרטים הועתקו' : 'העתקת פרטי התקלה'}
        icon={Copy}
        variant="text"
        onPress={() => {
          const c = readCrash()
          void Clipboard.setStringAsync(c ? crashText(c) : String(error)).then(() => setCopied(true))
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl },
})
