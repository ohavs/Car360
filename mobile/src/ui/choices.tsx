import { Check, type LucideIcon } from 'lucide-react-native'
import { useEffect } from 'react'
import { I18nManager, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/* ------------------------------- Switch -------------------------------- */

const TRACK_W = 52
const TRACK_H = 32
const TRAVEL = TRACK_W - TRACK_H

/** Material 3 switch: the thumb grows and shows a check when on. On sits at
 *  the end of the row — the left edge in RTL. */
export function Switch({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean
  onValueChange: (value: boolean) => void
  /** read by TalkBack */
  label: string
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const progress = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 260 })
  }, [value, progress])

  const direction = I18nManager.isRTL ? -1 : 1
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceContainer, colors.brand]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.muted, colors.brand]),
  }))
  const thumb = useAnimatedStyle(() => {
    const size = 16 + progress.value * 8
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX: direction * (progress.value * TRAVEL + (1 - progress.value) * 4) }],
      backgroundColor: interpolateColor(progress.value, [0, 1], [colors.muted, colors.onBrand]),
    }
  })

  return (
    <Touchable
      borderless
      disabled={disabled}
      onPress={() => {
        haptic.toggle()
        onValueChange(!value)
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      style={disabled && styles.disabled}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]}>
          {value && <Check size={14} color={colors.brand} strokeWidth={3} />}
        </Animated.View>
      </Animated.View>
    </Touchable>
  )
}

/* -------------------------- Segmented buttons -------------------------- */

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

/** 2–4 mutually exclusive options, all visible, one tap — instead of a
 *  dropdown that hides them. */
export function SegmentedButtons<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: ChoiceOption<T>[]
  /** read by TalkBack for the group */
  label: string
}) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segments, { borderColor: colors.outline }]}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <Touchable
            key={o.value}
            onPress={() => {
              if (active) return
              haptic.selection()
              onChange(o.value)
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={[
              styles.segment,
              i > 0 && { borderStartWidth: 1, borderStartColor: colors.outline },
              active && { backgroundColor: colors.brandContainer },
            ]}
          >
            {active ? (
              <Check size={16} color={colors.onSurface} strokeWidth={2.6} />
            ) : o.icon ? (
              <o.icon size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            ) : null}
            <Text variant="label" tone={active ? 'onSurface' : 'onSurfaceVariant'} numberOfLines={1}>
              {o.label}
            </Text>
          </Touchable>
        )
      })}
    </View>
  )
}

/* -------------------------------- Chips -------------------------------- */

/** A selectable chip: a check appears when it is on. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
}: {
  label: string
  selected?: boolean
  onPress: () => void
  icon?: LucideIcon
}) {
  const { colors } = useTheme()
  return (
    <Touchable
      onPress={() => {
        haptic.selection()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.brandContainer, borderColor: colors.brandContainer }
          : { backgroundColor: colors.surface, borderColor: colors.outline },
      ]}
    >
      {selected ? (
        <Check size={16} color={colors.onSurface} strokeWidth={2.6} />
      ) : Icon ? (
        <Icon size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
      ) : null}
      <Text variant="label" tone={selected ? 'onSurface' : 'onSurfaceVariant'}>
        {label}
      </Text>
    </Touchable>
  )
}

/** A horizontally scrolling row of single-choice filter chips. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: ChoiceOption<T>[]
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  )
}

/** Radio indicator for option lists. */
export function Radio({ selected }: { selected: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.radio, { borderColor: selected ? colors.brand : colors.muted }]}>
      {selected && <View style={[styles.radioDot, { backgroundColor: colors.brand }]} />}
    </View>
  )
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 2,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    start: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
    minHeight: 44,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
  },
  chipRow: {
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
})
