import { forwardRef, useState } from 'react'
import { StyleSheet, View, type TextInput } from 'react-native'
import { TextField, type TextFieldProps } from './TextField'
import { Text } from './Text'
import { radius, space } from '../theme/tokens'

/** Group the integer part as 15,000 and keep whatever decimal part is being typed. */
function group(raw: string): string {
  const [int, dec] = raw.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

/** Digits only in, grouped as 15,000 on screen, a plain number out. */
export const NumberField = forwardRef<
  TextInput,
  Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> & {
    value: number | undefined
    onChangeValue: (value: number | undefined) => void
    /** allow a decimal point (costs); off for whole numbers (km, year) */
    decimal?: boolean
  }
>(function NumberField({ value, onChangeValue, decimal = false, ...props }, ref) {
  // the text as typed — "12." must survive until the next digit arrives
  const [raw, setRaw] = useState(value === undefined ? '' : String(value))
  const typed = raw === '' ? undefined : Number(raw)
  // the value was changed from outside (reset, autofill): show that instead
  const shown = typed === value ? group(raw) : value === undefined ? '' : group(String(value))

  return (
    <TextField
      ref={ref}
      {...props}
      ltr
      value={shown}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onChangeText={(text) => {
        let clean = text.replace(decimal ? /[^\d.]/g : /\D/g, '')
        if (decimal) {
          const [int, ...rest] = clean.split('.')
          clean = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int
        }
        setRaw(clean)
        if (clean === '' || clean === '.') return onChangeValue(undefined)
        const n = Number(clean)
        if (Number.isFinite(n)) onChangeValue(n)
      }}
    />
  )
})

/** Israeli plate: typed as digits, shown as 12-345-67 / 123-45-678. */
export function formatPlateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 7) {
    // 7 digits: 2-3-2 while typing
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5)].filter(Boolean).join('-')
  }
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

export const PlateField = forwardRef<TextInput, Omit<TextFieldProps, 'keyboardType'>>(function PlateField(
  { value, onChangeText, ...props },
  ref,
) {
  return (
    <TextField
      ref={ref}
      {...props}
      ltr
      value={value ? formatPlateInput(value) : ''}
      onChangeText={(t) => onChangeText?.(t.replace(/\D/g, ''))}
      keyboardType="number-pad"
      maxLength={10}
    />
  )
})

/** The yellow Israeli licence plate, for display. */
export function Plate({ plate, size = 'regular' }: { plate: string; size?: 'regular' | 'large' }) {
  return (
    <View style={[styles.plate, size === 'large' && styles.plateLarge]}>
      <Text variant={size === 'large' ? 'headline' : 'label'} style={styles.plateText}>
        {formatPlateInput(plate)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  plate: {
    alignSelf: 'flex-start',
    backgroundColor: '#fcd34d',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: space.md,
    paddingVertical: 3,
  },
  plateLarge: {
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  plateText: {
    color: '#000000',
    letterSpacing: 2,
  },
})
