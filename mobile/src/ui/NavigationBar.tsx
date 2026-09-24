import type { LucideIcon } from 'lucide-react-native'
import { I18nManager, StyleSheet, View } from 'react-native'
import { useEffect, useState } from 'react'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
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

const PILL_WIDTH = 64

/** Material 3 navigation bar: one pill glides to the active destination's
 *  icon (with a little stretch on the way) and its label turns bold. Sits
 *  above the system gesture area. */
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
  const [width, setWidth] = useState(0)
  // RTL: the first destination is on the right
  const index = Math.max(0, items.findIndex((i) => i.key === activeKey))
  const count = items.length
  const x = useSharedValue(0)
  const stretch = useSharedValue(1)
  const placed = useSharedValue(false)
  useEffect(() => {
    if (width <= 0) return
    const slotWidth = width / Math.max(1, count)
    const fromStart = index * slotWidth + (slotWidth - PILL_WIDTH) / 2
    const to = I18nManager.isRTL ? width - fromStart - PILL_WIDTH : fromStart
    if (!placed.value) {
      x.value = to
      placed.value = true
      return
    }
    x.value = withSpring(to, { damping: 22, stiffness: 260, mass: 0.8 })
    // a little stretch while it travels
    stretch.value = withSequence(withTiming(1.3, { duration: 90 }), withSpring(1, { damping: 14, stiffness: 180 }))
  }, [width, index, count, x, stretch, placed])
  const pill = useAnimatedStyle(() => ({
    opacity: placed.value ? 1 : 0,
    transform: [{ translateX: x.value }, { scaleX: stretch.value }],
  }))
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.outline, paddingBottom: insets.bottom }]}
    >
      <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.brandContainer }, pill]} />
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
  const Icon = item.icon
  const count = typeof item.badge === 'number' ? item.badge : 0
  return (
    <Touchable
      feedback="none"
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count ? `${item.label}, ${count}` : item.label}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
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
    position: 'absolute',
    // RN positions absolute children from the physical left even in RTL when
    // using `left`; the translateX above is computed in those terms
    left: 0,
    top: space.sm,
    width: PILL_WIDTH,
    height: 32,
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
