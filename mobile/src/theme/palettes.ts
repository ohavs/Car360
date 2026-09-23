/** Colour tokens, ported 1:1 from the web app's src/index.css so both apps
 *  read as the same product. Semantic names follow Material 3 roles:
 *
 *  background  ← canvas      surface ← card        surfaceContainer ← card-2
 *  onSurface   ← ink         onSurfaceVariant ← ink-2   muted ← ink-3
 *  outline     ← line
 *  primary     ← accent  (the palette's deep tone: filled buttons)
 *  brand       ← cta     (the palette's vivid tone: FAB, selection, focus)
 */

export type PaletteId = 'classic' | 'ocean' | 'forest' | 'sunset' | 'violet'

export interface Colors {
  background: string
  surface: string
  surfaceContainer: string
  onSurface: string
  onSurfaceVariant: string
  muted: string
  outline: string
  primary: string
  onPrimary: string
  brand: string
  onBrand: string
  brandContainer: string
  success: string
  successContainer: string
  warning: string
  warningContainer: string
  danger: string
  dangerContainer: string
  onDanger: string
  scrim: string
}

const classicLight: Colors = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceContainer: '#eef1f4',
  onSurface: '#0f172a',
  onSurfaceVariant: '#48566b',
  muted: '#8b98ab',
  outline: '#e2e8f0',
  primary: '#0f172a',
  onPrimary: '#ffffff',
  brand: '#dc2626',
  onBrand: '#ffffff',
  brandContainer: '#fee2e2',
  success: '#16a34a',
  successContainer: '#dcfce7',
  warning: '#d97706',
  warningContainer: '#fef3c7',
  danger: '#dc2626',
  dangerContainer: '#fee2e2',
  onDanger: '#ffffff',
  scrim: 'rgba(0,0,0,0.6)',
}

const classicDark: Colors = {
  background: '#0b1120',
  surface: '#151e30',
  surfaceContainer: '#1e2940',
  onSurface: '#f1f5f9',
  onSurfaceVariant: '#a9b6c9',
  muted: '#64748b',
  outline: '#263349',
  primary: '#f1f5f9',
  onPrimary: '#0b1120',
  brand: '#ef4444',
  onBrand: '#ffffff',
  brandContainer: '#3b1519',
  success: '#4ade80',
  successContainer: '#102b1c',
  warning: '#fbbf24',
  warningContainer: '#33260c',
  danger: '#f87171',
  dangerContainer: '#3b1519',
  onDanger: '#0b1120',
  scrim: 'rgba(0,0,0,0.6)',
}

type Overrides = Partial<Colors>

const overrides: Record<Exclude<PaletteId, 'classic'>, { light: Overrides; dark: Overrides }> = {
  ocean: {
    light: {
      background: '#e8f1f8',
      surface: '#f6fbfe',
      surfaceContainer: '#e0ebf3',
      primary: '#0c4a6e',
      onPrimary: '#ffffff',
      brand: '#0284c7',
      brandContainer: '#dbeafe',
    },
    dark: {
      background: '#081521',
      surface: '#0f2233',
      surfaceContainer: '#163044',
      outline: '#1e3a52',
      primary: '#bae6fd',
      onPrimary: '#082131',
      brand: '#38bdf8',
      onBrand: '#082131',
      brandContainer: '#0c2f42',
    },
  },
  forest: {
    light: {
      background: '#ebf4ed',
      surface: '#f6fcf7',
      surfaceContainer: '#e2efe5',
      primary: '#14532d',
      onPrimary: '#ffffff',
      brand: '#16a34a',
      brandContainer: '#dcfce7',
    },
    dark: {
      background: '#0a1410',
      surface: '#12231a',
      surfaceContainer: '#1a3125',
      outline: '#22402f',
      primary: '#bbf7d0',
      onPrimary: '#08160e',
      brand: '#4ade80',
      onBrand: '#08160e',
      brandContainer: '#10331f',
    },
  },
  sunset: {
    light: {
      background: '#fbf2e8',
      surface: '#fefaf5',
      surfaceContainer: '#f6e9da',
      primary: '#7c2d12',
      onPrimary: '#ffffff',
      brand: '#ea580c',
      brandContainer: '#ffedd5',
    },
    dark: {
      background: '#16100b',
      surface: '#241a12',
      surfaceContainer: '#33251a',
      outline: '#3d2d20',
      primary: '#fed7aa',
      onPrimary: '#1f1409',
      brand: '#fb923c',
      onBrand: '#1f1409',
      brandContainer: '#3a2412',
    },
  },
  violet: {
    light: {
      background: '#f2edfb',
      surface: '#fbf9fe',
      surfaceContainer: '#e9e2f6',
      primary: '#4c1d95',
      onPrimary: '#ffffff',
      brand: '#7c3aed',
      brandContainer: '#ede9fe',
    },
    dark: {
      background: '#0f0b1d',
      surface: '#191331',
      surfaceContainer: '#241c42',
      outline: '#2e2551',
      primary: '#ddd6fe',
      onPrimary: '#150e2b',
      brand: '#a78bfa',
      onBrand: '#150e2b',
      brandContainer: '#251b47',
    },
  },
}

export function paletteColors(palette: PaletteId, dark: boolean): Colors {
  const base = dark ? classicDark : classicLight
  if (palette === 'classic') return base
  return { ...base, ...overrides[palette][dark ? 'dark' : 'light'] }
}
