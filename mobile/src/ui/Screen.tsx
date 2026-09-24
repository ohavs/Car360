import { useRouter } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import { createContext, useState, type ReactNode } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { IconButton } from './IconButton'
import { Text } from './Text'

/** Top app bar. In RTL the back arrow points right — towards where you came from. */
export function AppBar({
  title,
  subtitle,
  back = false,
  leading,
  actions,
}: {
  title?: string
  subtitle?: string
  back?: boolean
  /** replaces the back arrow, e.g. the ✕ of a full-screen form */
  leading?: ReactNode
  actions?: ReactNode
}) {
  const router = useRouter()
  return (
    <View style={styles.bar}>
      {leading}
      {back && !leading && <IconButton icon={ArrowRight} label="חזרה" onPress={() => router.back()} />}
      <View style={styles.titles}>
        {title ? (
          <Text variant="headline" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions}
    </View>
  )
}

/** When the current screen opened — content that arrives while it is still
 *  sliding in shows up without an extra animation of its own. */
export const ScreenOpenedAt = createContext(0)

/** A full screen: edge-to-edge background, the app bar under the status bar,
 *  and scrollable content that clears the gesture/navigation bar. */
export function Screen({
  children,
  header,
  refreshing,
  onRefresh,
  fab,
}: {
  children: ReactNode
  header?: ReactNode
  /** floating action button, kept clear of the last row */
  fab?: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [openedAt] = useState(() => Date.now())
  return (
    <ScreenOpenedAt.Provider value={openedAt}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {header}
        {/* keeps the focused field above the keyboard, with room for its error line */}
        <KeyboardAwareScrollView
          bottomOffset={space.xxxl}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl + (fab ? 72 : 0) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                colors={[colors.brand]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </KeyboardAwareScrollView>
        {fab}
      </View>
    </ScreenOpenedAt.Provider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 64,
    paddingHorizontal: space.sm,
  },
  titles: {
    flex: 1,
    paddingHorizontal: space.sm,
  },
  content: {
    paddingHorizontal: space.lg,
    // room for an outlined field's floating label when a form starts at the top
    paddingTop: space.md,
    gap: space.lg,
  },
})
