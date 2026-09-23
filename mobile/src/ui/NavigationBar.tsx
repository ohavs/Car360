import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  /** a number shows a count, true a dot */
  badge?: number | boolean
}

/** Material 3 navigation bar: the active destination gets a pill behind its
 *  icon and a bold label. Sits above the system gesture area. */
export function NavigationBar({
  items,
  activeKey,
  onSelect,
}: {
  items: NavItem[]
  activeKey: string
  onSelect: (key: string) => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.outline, paddingBottom: insets.bottom }]}
    >
      {items.map((item) => (
        <Destination
          key={item.key}
          item={item}
          active={item.key === activeKey}
          onPress={() => {
            if (item.key !== activeKey) haptic.selection()
            onSelect(item.key)
          }}
        />
      ))}
    </View>
  )
}

function Destination({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  const pill = useAnimatedStyle(() => ({
    opacity: withSpring(active ? 1 : 0, { damping: 20 }),
    transform: [{ scaleX: withSpring(active ? 1 : 0.4, { damping: 18, stiffness: 240 }) }],
  }))
  const Icon = item.icon
  const count = typeof item.badge === 'number' ? item.badge : 0
  return (
    <Touchable
      borderless
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count ? `${item.label}, ${count}` : item.label}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.brandContainer }, pill]} />
        <Icon size={24} color={active ? colors.onSurface : colors.onSurfaceVariant} strokeWidth={active ? 2.3 : 1.8} />
        {item.badge ? (
          <View
            style={[
              count ? styles.count : styles.dot,
              { backgroundColor: colors.danger, borderColor: colors.surface },
            ]}
          >
            {count ? (
              <Text variant="overline" style={{ color: colors.onDanger }}>
                {count > 9 ? '9+' : count}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text variant="overline" tone={active ? 'onSurface' : 'onSurfaceVariant'} style={active ? styles.activeLabel : undefined}>
        {item.label}
      </Text>
    </Touchable>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingBottom: space.sm,
    minHeight: 64,
  },
  iconWrap: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
  },
  activeLabel: {
    fontWeight: '800',
  },
  dot: {
    position: 'absolute',
    top: 2,
    end: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  count: {
    position: 'absolute',
    top: -2,
    end: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
