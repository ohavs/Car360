import { ActivityIndicator } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

/** Indeterminate progress, in the brand colour. */
export function Spinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  const { colors } = useTheme()
  return <ActivityIndicator size={size} color={colors.brand} />
}
