import { useRouter } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
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
  actions,
}: {
  title?: string
  subtitle?: string
  back?: boolean
  actions?: ReactNode
}) {
  const router = useRouter()
  return (
    <View style={styles.bar}>
      {back && <IconButton icon={ArrowRight} label="חזרה" onPress={() => router.back()} />}
      <View style={styles.titles}>
        {title ? (
          <Text variant="headline" numberOfLines={1}>
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

/** A full screen: edge-to-edge background, the app bar under the status bar,
 *  and scrollable content that clears the gesture/navigation bar. */
export function Screen({
  children,
  header,
  refreshing,
  onRefresh,
}: {
  children: ReactNode
  header?: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
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
      </ScrollView>
    </View>
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
    gap: space.lg,
  },
})
