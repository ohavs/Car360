import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { paletteColors, type Colors, type PaletteId } from './palettes'

interface Theme {
  colors: Colors
  dark: boolean
  palette: PaletteId
}

const ThemeContext = createContext<Theme>({
  colors: paletteColors('classic', false),
  dark: false,
  palette: 'classic',
})

/** Follows the system light/dark setting. Palette, accent and a manual
 *  light/dark override arrive with the design-system milestone (M2). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const palette: PaletteId = 'classic'

  const value = useMemo(() => ({ colors: paletteColors(palette, dark), dark, palette }), [dark])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
