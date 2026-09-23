import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Colors } from '../theme/palettes'
import { type, type TypeVariant } from '../theme/tokens'

export interface AppTextProps extends TextProps {
  variant?: TypeVariant
  /** a colour role from the palette */
  tone?: keyof Colors
  align?: TextStyle['textAlign']
}

/** The only text component screens use. Hebrew is right-aligned by the
 *  forced-RTL layout, so `align` is only for the exceptions (centred copy). */
export function Text({ variant = 'body', tone = 'onSurface', align, style, ...props }: AppTextProps) {
  const { colors } = useTheme()
  return (
    <RNText
      // system font scaling is honoured, capped so layouts never break apart
      maxFontSizeMultiplier={1.3}
      style={[type[variant], { color: colors[tone] }, align ? { textAlign: align } : null, style]}
      {...props}
    />
  )
}
