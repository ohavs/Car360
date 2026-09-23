import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { readPref, writePref } from '../lib/storage'
import { paletteColors, PALETTES, withAccent, type Colors, type PaletteId } from './palettes'

export type ThemeMode = 'system' | 'light' | 'dark'

interface Theme {
  colors: Colors
  dark: boolean
  mode: ThemeMode
  palette: PaletteId
  /** personal accent replacing the palette's vivid tone; null = palette default */
  accent: string | null
  setMode: (mode: ThemeMode) => void
  setPalette: (palette: PaletteId) => void
  setAccent: (accent: string | null) => void
}

const ThemeContext = createContext<Theme | null>(null)

function initialPalette(): PaletteId {
  const saved = readPref<PaletteId>('palette', 'classic')
  return PALETTES.some((p) => p.id === saved) ? saved : 'classic'
}

/** Theme choices apply instantly and persist on the device. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>(() => readPref<ThemeMode>('themeMode', 'system'))
  const [palette, setPaletteState] = useState<PaletteId>(initialPalette)
  const [accent, setAccentState] = useState<string | null>(() => readPref<string | null>('accent', null))

  const dark = mode === 'system' ? scheme === 'dark' : mode === 'dark'

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    writePref('themeMode', next)
  }, [])
  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next)
    writePref('palette', next)
  }, [])
  const setAccent = useCallback((next: string | null) => {
    setAccentState(next)
    writePref('accent', next)
  }, [])

  const value = useMemo<Theme>(
    () => ({
      colors: withAccent(paletteColors(palette, dark), accent),
      dark,
      mode,
      palette,
      accent,
      setMode,
      setPalette,
      setAccent,
    }),
    [dark, mode, palette, accent, setMode, setPalette, setAccent],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
