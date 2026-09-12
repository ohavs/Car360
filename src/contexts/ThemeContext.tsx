import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SKINS, type PaletteId, type SkinId } from '../lib/palettes'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  palette: PaletteId
  setPalette: (p: PaletteId) => void
  skin: SkinId
  setSkin: (s: SkinId) => void
  /** personal accent (hex) that overrides the palette's CTA color; null = palette default */
  accent: string | null
  setAccent: (hex: string | null) => void
  /** apply cloud-synced prefs silently (no restyle loader) */
  applyRemote: (p: PaletteId, s: SkinId, accent: string | null) => void
  /** true while the restyle loader is showing */
  restyling: boolean
}

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  toggle: () => {},
  palette: 'classic',
  setPalette: () => {},
  skin: 'minimal',
  setSkin: () => {},
  accent: null,
  setAccent: () => {},
  applyRemote: () => {},
  restyling: false,
})

const THEME_KEY = 'car360:theme'
const PALETTE_KEY = 'car360:palette'
const SKIN_KEY = 'car360:skin'
const ACCENT_KEY = 'car360:accent'

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialPalette(): PaletteId {
  const saved = localStorage.getItem(PALETTE_KEY)
  return (saved as PaletteId) || 'classic'
}

function initialSkin(): SkinId {
  const saved = localStorage.getItem(SKIN_KEY)
  // 'neu' and 'aurora' were retired; a device still holding one would otherwise
  // land on a data-skin with no stylesheet behind it
  return SKINS.some((s) => s.id === saved) ? (saved as SkinId) : 'minimal'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [palette, setPaletteState] = useState<PaletteId>(initialPalette)
  const [skin, setSkinState] = useState<SkinId>(initialSkin)
  const [accent, setAccentState] = useState<string | null>(() => localStorage.getItem(ACCENT_KEY))
  const [restyling, setRestyling] = useState(false)
  const restyleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.palette = palette
    root.dataset.skin = skin
    localStorage.setItem(THEME_KEY, theme)
    localStorage.setItem(PALETTE_KEY, palette)
    localStorage.setItem(SKIN_KEY, skin)

    // personal accent overrides the palette CTA color (+ a derived soft tint)
    if (accent) {
      root.style.setProperty('--c-cta', accent)
      root.style.setProperty('--c-cta-soft', `color-mix(in srgb, ${accent} 16%, transparent)`)
      localStorage.setItem(ACCENT_KEY, accent)
    } else {
      root.style.removeProperty('--c-cta')
      root.style.removeProperty('--c-cta-soft')
      localStorage.removeItem(ACCENT_KEY)
    }

    // keep the browser chrome / PWA titlebar in sync with the actual canvas
    requestAnimationFrame(() => {
      const bg = getComputedStyle(document.body).backgroundColor
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    })
  }, [theme, palette, skin, accent])

  /** Show the "rebuilding your design" loader, apply the change mid-way,
   *  release after the new style has painted. */
  const restyle = useCallback((apply: () => void) => {
    if (restyleTimer.current) clearTimeout(restyleTimer.current)
    setRestyling(true)
    restyleTimer.current = setTimeout(() => {
      apply()
      restyleTimer.current = setTimeout(() => setRestyling(false), 900)
    }, 450)
  }, [])

  const setPalette = useCallback(
    (p: PaletteId) => restyle(() => setPaletteState(p)),
    [restyle],
  )
  const setSkin = useCallback((s: SkinId) => restyle(() => setSkinState(s)), [restyle])
  // accent changes are instant (no full-screen rebuild — it's a light recolor)
  const setAccent = useCallback((hex: string | null) => setAccentState(hex), [])

  const applyRemote = useCallback(
    (p: PaletteId, s: SkinId, a: string | null) => {
      setPaletteState(p)
      setSkinState(s)
      setAccentState(a)
    },
    [],
  )

  return (
    <Ctx.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
        palette,
        setPalette,
        skin,
        setSkin,
        accent,
        setAccent,
        applyRemote,
        restyling,
      }}
    >
      {children}
      <AnimatePresence>
        {restyling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-canvas/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative flex size-20 items-center justify-center"
            >
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-line border-t-cta" />
              <span className="absolute inset-3 animate-spin rounded-full border-4 border-transparent border-b-ink [animation-direction:reverse] [animation-duration:1.2s]" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-base font-black"
            >
              בונה את העיצוב מחדש…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
