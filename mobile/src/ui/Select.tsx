import { Check, ChevronDown, type LucideIcon } from 'lucide-react-native'
import { useRef, useState, type ReactNode } from 'react'
import { I18nManager, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Radio } from './choices'
import { Touchable } from './Pressable'
import { Sheet } from './Sheet'
import { Text } from './Text'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

/** The closed state shared by every picker: an outlined field like
 *  TextField, its label floated above the chosen value, and a trailing icon. */
export function FieldTrigger({
  label,
  valueText,
  placeholder,
  icon: Icon = ChevronDown,
  onPress,
  error,
  hint,
  trailing,
}: {
  label: string
  valueText?: string
  placeholder?: string
  icon?: LucideIcon
  onPress: () => void
  error?: string | null
  hint?: string
  trailing?: ReactNode
}) {
  const { colors } = useTheme()
  const filled = Boolean(valueText)
  return (
    <View>
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueText ?? placeholder ?? 'לא נבחר'}`}
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.outline, borderWidth: error ? 2 : 1 },
        ]}
      >
        <View style={styles.triggerText}>
          {filled ? (
            <Text variant="caption" tone={error ? 'danger' : 'muted'} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
          <Text variant="body" tone={filled ? 'onSurface' : 'muted'} numberOfLines={1}>
            {filled ? valueText : (placeholder ?? label)}
          </Text>
        </View>
        {trailing}
        <Icon size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
      </Touchable>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'muted'} style={styles.support}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  )
}

/** Material 3 exposed dropdown: the menu opens right under the field. For
 *  short lists (up to ~7 options). */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string
  value: T | undefined
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  error?: string | null
  hint?: string
}) {
  const { colors } = useTheme()
  const anchor = useRef<View>(null)
  const insets = useSafeAreaInsets()
  const { width: screenW, height: screenH } = useWindowDimensions()
  const [menu, setMenu] = useState<{ x: number; y: number; width: number; above: boolean } | null>(null)
  const current = options.find((o) => o.value === value)

  const open = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      const menuH = Math.min(options.length * 52 + 16, 360)
      const below = y + height + 4
      const above = below + menuH > screenH - insets.bottom - 16
      setMenu({ x, y: above ? y - menuH - 4 : below, width, above })
      haptic.toggle()
    })
  }

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <FieldTrigger
          label={label}
          valueText={current?.label}
          placeholder={placeholder}
          onPress={open}
          error={error}
          hint={hint}
        />
      </View>
      <Modal visible={Boolean(menu)} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={() => setMenu(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} accessibilityLabel="סגירה" />
        {menu && (
          <Animated.View
            entering={FadeIn.duration(120)}
            exiting={FadeOut.duration(90)}
            style={[
              styles.menu,
              {
                // measureInWindow is physical; layout offsets are logical in RTL
                start: I18nManager.isRTL ? screenW - menu.x - menu.width : menu.x,
                top: menu.y,
                width: menu.width,
                backgroundColor: colors.surface,
                borderColor: colors.outline,
              },
            ]}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((o) => {
                const active = o.value === value
                return (
                  <Touchable
                    key={o.value}
                    onPress={() => {
                      haptic.selection()
                      onChange(o.value)
                      setMenu(null)
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    style={[styles.menuItem, active && { backgroundColor: colors.brandContainer }]}
                  >
                    <Text variant={active ? 'bodyStrong' : 'body'} style={styles.flex} numberOfLines={1}>
                      {o.label}
                    </Text>
                    {active && <Check size={18} color={colors.onSurface} strokeWidth={2.6} />}
                  </Touchable>
                )
              })}
            </ScrollView>
          </Animated.View>
        )}
      </Modal>
    </>
  )
}

/** A long or descriptive list of options in a bottom sheet with radios. */
export function SheetSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string
  value: T | undefined
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  error?: string | null
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <>
      <FieldTrigger
        label={label}
        valueText={current?.label}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
        error={error}
        hint={hint}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View>
          {options.map((o) => (
            <Touchable
              key={o.value}
              onPress={() => {
                haptic.selection()
                onChange(o.value)
                setOpen(false)
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: o.value === value }}
              style={styles.sheetItem}
            >
              <Radio selected={o.value === value} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{o.label}</Text>
                {o.description ? (
                  <Text variant="caption" tone="muted">
                    {o.description}
                  </Text>
                ) : null}
              </View>
            </Touchable>
          ))}
        </View>
      </Sheet>
    </>
  )
}

/** Picks the right control for the list length: an anchored dropdown for
 *  short lists, a sheet for long ones. */
export function Select<T extends string>(props: Parameters<typeof Dropdown<T>>[0]) {
  return props.options.length <= 7 ? <Dropdown {...props} /> : <SheetSelect {...props} />
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 56,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  triggerText: {
    flex: 1,
  },
  support: {
    marginTop: space.xs,
    paddingHorizontal: space.lg,
  },
  menu: {
    position: 'absolute',
    maxHeight: 360,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    overflow: 'hidden',
    boxShadow: '0 12px 32px -8px rgba(0,0,0,0.35)',
  },
  menuItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  sheetItem: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  flex: {
    flex: 1,
  },
})
