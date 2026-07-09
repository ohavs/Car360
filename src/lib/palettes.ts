/** Color palettes — each palette overrides the semantic CSS variables in
 *  both light and dark mode (definitions live in index.css under
 *  [data-palette='...']). The metadata here drives the settings UI. */

export type PaletteId = 'classic' | 'ocean' | 'forest' | 'sunset' | 'violet'

export interface PaletteMeta {
  id: PaletteId
  label: string
  /** swatch preview colors (light-mode accent + cta + canvas) */
  preview: [string, string, string]
}

export const PALETTES: PaletteMeta[] = [
  { id: 'classic', label: 'קלאסי', preview: ['#0f172a', '#dc2626', '#f6f7f9'] },
  { id: 'ocean', label: 'אוקיינוס', preview: ['#0c4a6e', '#0284c7', '#eff6fa'] },
  { id: 'forest', label: 'יער', preview: ['#14532d', '#16a34a', '#f2f7f2'] },
  { id: 'sunset', label: 'שקיעה', preview: ['#7c2d12', '#ea580c', '#faf5f0'] },
  { id: 'violet', label: 'סגול לילה', preview: ['#4c1d95', '#7c3aed', '#f7f5fb'] },
]

export type SkinId = 'minimal' | 'glass' | 'neu'

export interface SkinMeta {
  id: SkinId
  label: string
  description: string
}

export const SKINS: SkinMeta[] = [
  { id: 'minimal', label: 'מינימל', description: 'נקי, שטוח וממוקד — ברירת המחדל' },
  { id: 'glass', label: 'זכוכית', description: 'Glassmorphism — טשטוש, שקיפות ורקע חי' },
  { id: 'neu', label: 'נאומורפיזם', description: 'Soft UI — משטחים רכים בולטים ושקועים' },
]
