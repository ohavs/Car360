import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { X, type LucideIcon } from 'lucide-react-native'
import { createContext, forwardRef, useContext, useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'
import { motion, radius, space, type } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** Set by Sheet: inputs inside a bottom sheet must use its keyboard-aware input. */
export const InSheetContext = createContext(false)

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string
  /** shown under the field; replaced by `error` when there is one */
  hint?: string
  error?: string | null
  leadingIcon?: LucideIcon
  /** text inside the field after the value, e.g. ₪ or ק״מ */
  suffix?: string
  /** trailing element instead of the clear button (e.g. an action) */
  trailing?: ReactNode
  /** content that always reads left-to-right: plate, VIN, phone, email, links */
  ltr?: boolean
  clearable?: boolean
  style?: StyleProp<ViewStyle>
}

/** Outlined Material 3 text field: the label sits inside the field and floats
 *  to the border on focus or once there is a value; errors appear inline
 *  under the field instead of in a toast. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    leadingIcon: Icon,
    suffix,
    trailing,
    ltr = false,
    clearable = true,
    multiline,
    value,
    onChangeText,
    onFocus,
    onBlur,
    editable = true,
    style,
    ...inputProps
  },
  ref,
) {
  const { colors } = useTheme()
  const inSheet = useContext(InSheetContext)
  const [focused, setFocused] = useState(false)
  const filled = Boolean(value && value.length > 0)
  const floated = useSharedValue(focused || filled ? 1 : 0)

  useEffect(() => {
    floated.value = withTiming(focused || filled ? 1 : 0, { duration: motion.fast })
  }, [focused, filled, floated])

  const labelStyle = useAnimatedStyle(() => ({
    top: 16 - floated.value * 25,
    fontSize: 16 - floated.value * 4,
  }))

  const borderColor = error ? colors.danger : focused ? colors.brand : colors.outline
  const labelColor = error ? colors.danger : focused ? colors.brand : colors.muted
  const Input = inSheet ? BottomSheetTextInput : TextInput

  return (
    <View style={style}>
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          { borderColor, borderWidth: focused || error ? 2 : 1, backgroundColor: colors.surface },
          !editable && { opacity: 0.55 },
        ]}
      >
        {Icon && <Icon size={20} color={focused ? colors.brand : colors.muted} strokeWidth={1.9} />}
        <View style={styles.inputWrap}>
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.label,
              { fontFamily: type.label.fontFamily, fontWeight: '600', color: labelColor, backgroundColor: colors.surface },
              labelStyle,
            ]}
          >
            {label}
          </Animated.Text>
          <Input
            ref={ref as never}
            value={value}
            onChangeText={onChangeText}
            editable={editable}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              onBlur?.(e)
            }}
            accessibilityLabel={label}
            accessibilityHint={error ?? hint}
            placeholderTextColor={colors.muted}
            cursorColor={colors.brand}
            selectionColor={colors.brandContainer}
            selectionHandleColor={colors.brand}
            underlineColorAndroid="transparent"
            maxFontSizeMultiplier={1.3}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={[
              styles.input,
              type.body,
              { color: colors.onSurface },
              multiline && styles.inputMultiline,
              ltr && styles.ltr,
            ]}
            {...inputProps}
          />
        </View>
        {suffix ? (
          <Text variant="label" tone="muted">
            {suffix}
          </Text>
        ) : null}
        {trailing ??
          (clearable && filled && editable && focused ? (
            <Touchable
              borderless
              onPress={() => onChangeText?.('')}
              accessibilityRole="button"
              accessibilityLabel={`ניקוי ${label}`}
              style={styles.clear}
            >
              <X size={18} color={colors.muted} strokeWidth={2.2} />
            </Touchable>
          ) : null)}
      </View>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'muted'} style={styles.support}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  box: {
    minHeight: 56,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: space.md,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    start: -4,
    paddingHorizontal: 4,
    maxWidth: '100%',
  },
  input: {
    minHeight: 54,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  inputMultiline: {
    minHeight: 96,
    maxHeight: 180,
    paddingTop: space.md,
  },
  // Android lays digits and Latin out LTR on its own; alignment stays with
  // the RTL layout so every field lines up on the same edge
  ltr: {
    writingDirection: 'ltr',
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  support: {
    marginTop: space.xs,
    paddingHorizontal: space.lg,
  },
})
