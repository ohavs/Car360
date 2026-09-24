import type { TextStyle } from 'react-native'

/** Heebo is embedded natively as one font family with real weights (see the
 *  expo-font entry in app.config.ts), so a weight picks the matching file. */
const family = 'Heebo'

export const type = {
  display: { fontFamily: family, fontWeight: '900', fontSize: 32, lineHeight: 38 },
  headline: { fontFamily: family, fontWeight: '800', fontSize: 24, lineHeight: 30 },
  title: { fontFamily: family, fontWeight: '800', fontSize: 18, lineHeight: 24 },
  body: { fontFamily: family, fontWeight: '500', fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: family, fontWeight: '700', fontSize: 16, lineHeight: 23 },
  label: { fontFamily: family, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: family, fontWeight: '500', fontSize: 12, lineHeight: 17 },
  overline: { fontFamily: family, fontWeight: '700', fontSize: 11, lineHeight: 15 },
} satisfies Record<string, TextStyle>

export type TypeVariant = keyof typeof type

/** 4dp grid */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  field: 16,
  card: 20,
  sheet: 28,
  full: 999,
} as const

/** smallest comfortable touch target, per Material guidance */
export const TOUCH = 48

export const motion = {
  fast: 150,
  standard: 250,
  emphasized: 350,
} as const

/** Icon sizes: sm inside chips and captions, md in rows and buttons, lg for
 *  standalone destinations (shortcuts, empty states). */
export const icon = {
  sm: 16,
  md: 20,
  lg: 24,
} as const

/** The round tinted badge an icon sits in: sm in dense rows, md in list
 *  rows, lg for shortcuts. */
export const badge = {
  sm: 32,
  md: 40,
  lg: 48,
} as const
