/** Field dictionary for the deep vehicle report: maps the Ministry of Transport
 *  column names to Hebrew labels and groups them into readable sections.
 *  Anything not listed here still reaches the UI via the "additional data"
 *  section — we never silently drop a field. */

import { isEmpty } from './vehicleReport'

export interface FieldDef {
  /** possible column names across the different datasets */
  keys: string[]
  label: string
  /** optional value formatter */
  format?: (v: string) => string
  hint?: string
}

export interface SectionDef {
  id: string
  title: string
  icon: 'car' | 'calendar' | 'users' | 'fuel' | 'shield' | 'wrench' | 'file' | 'alert'
  fields: FieldDef[]
}

const date = (v: string) => {
  const m = v.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${Number(m[3])}.${Number(m[2])}.${m[1]}`
  // some columns arrive as YYYYMMDD
  const c = v.replace(/\D/g, '')
  if (c.length === 8) return `${Number(c.slice(6, 8))}.${Number(c.slice(4, 6))}.${c.slice(0, 4)}`
  return v
}

const num = (v: string) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n.toLocaleString('he-IL') : v
}

const km = (v: string) => `${num(v)} ק״מ`

/** Ownership codes used by the registry. */
const OWNERSHIP: Record<string, string> = {
  'פרטי': 'פרטית',
  'חברה': 'חברה / ליסינג',
  'השכרה': 'השכרה',
  'ליסינג': 'ליסינג',
  'לימוד נהיגה': 'לימוד נהיגה',
  'מונית': 'מונית',
  'ממשלתי': 'ממשלתי',
}
const ownership = (v: string) => OWNERSHIP[v.trim()] ?? v

export const SECTIONS: SectionDef[] = [
  {
    id: 'identity',
    title: 'זהות הרכב',
    icon: 'car',
    fields: [
      { keys: ['tozeret_nm', 'tozar'], label: 'יצרן' },
      { keys: ['kinuy_mishari'], label: 'כינוי מסחרי' },
      { keys: ['degem_nm', 'degem'], label: 'דגם' },
      { keys: ['ramat_gimur'], label: 'רמת גימור' },
      { keys: ['shnat_yitzur'], label: 'שנת ייצור' },
      { keys: ['tzeva_rechev', 'tzeva'], label: 'צבע' },
      { keys: ['misgeret', 'shilda'], label: 'מספר שלדה (VIN)' },
      { keys: ['sug_degem'], label: 'סוג דגם' },
      { keys: ['sug_rechev_nm', 'sug_rechev'], label: 'סוג רכב' },
      { keys: ['tozeret_eretz_nm', 'eretz_yitzur'], label: 'ארץ ייצור' },
      { keys: ['degem_cd'], label: 'קוד דגם' },
      { keys: ['tozeret_cd'], label: 'קוד תוצר' },
    ],
  },
  {
    id: 'licensing',
    title: 'רישוי, טסט ונסועה',
    icon: 'calendar',
    fields: [
      { keys: ['tokef_dt', 'tokef_rishaion'], label: 'תוקף רישיון (טסט)', format: date },
      { keys: ['mivchan_acharon_dt'], label: 'מבחן רישוי אחרון', format: date },
      { keys: ['moed_aliya_lakvish'], label: 'עלייה לכביש', format: date },
      { keys: ['kilometraj', 'km', 'kilometrage', 'nesua'], label: 'קילומטראז׳', format: km },
      { keys: ['horaat_rishum'], label: 'הוראת רישום' },
      { keys: ['bitul_dt', 'taarich_bitul'], label: 'תאריך ביטול רישום', format: date },
    ],
  },
  {
    id: 'ownership',
    title: 'בעלות ושימוש',
    icon: 'users',
    fields: [
      { keys: ['baalut'], label: 'סוג בעלות', format: ownership, hint: 'פרטית / חברה / השכרה — משפיע על ערך הרכב' },
      { keys: ['mispar_baalim', 'yad'], label: 'מספר ידיים' },
      { keys: ['shimush', 'sug_shimush'], label: 'שימוש' },
      { keys: ['mkoriut', 'mekoriut'], label: 'מקוריות' },
      { keys: ['yevu_ishi', 'sug_yevu'], label: 'יבוא' },
    ],
  },
  {
    id: 'engine',
    title: 'מנוע והנעה',
    icon: 'fuel',
    fields: [
      { keys: ['sug_delek_nm', 'sug_delek'], label: 'סוג דלק' },
      { keys: ['degem_manoa'], label: 'דגם מנוע' },
      { keys: ['nefach_manoa'], label: 'נפח מנוע', format: (v) => `${num(v)} סמ״ק` },
      { keys: ['koah_sus', 'hespek'], label: 'הספק' },
      { keys: ['hanaa_nm', 'hanaa'], label: 'הנעה' },
      { keys: ['automatic_ind', 'sug_gir'], label: 'תיבת הילוכים' },
    ],
  },
  {
    id: 'safety',
    title: 'בטיחות וזיהום',
    icon: 'shield',
    fields: [
      { keys: ['ramat_eivzur_betihuty'], label: 'רמת אבזור בטיחותי', hint: 'סולם 0–8 של משרד התחבורה' },
      { keys: ['nikud_betihut'], label: 'ניקוד בטיחות' },
      { keys: ['kvutzat_zihum'], label: 'קבוצת זיהום', hint: 'סולם 1–15, נמוך = מזהם פחות' },
      { keys: ['madad_yarok', 'co2'], label: 'מדד ירוק / CO₂' },
      { keys: ['kamut_nosim', 'mispar_moshavim'], label: 'מספר מושבים' },
      { keys: ['mishkal_kolel'], label: 'משקל כולל', format: (v) => `${num(v)} ק״ג` },
      { keys: ['zmig_kidmi'], label: 'צמיג קדמי' },
      { keys: ['zmig_ahori'], label: 'צמיג אחורי' },
    ],
  },
  {
    id: 'recall',
    title: 'קריאות שירות (ריקול)',
    icon: 'alert',
    fields: [
      { keys: ['sug_takala', 'SUG_TAKALA'], label: 'סוג התקלה' },
      { keys: ['teur_takala', 'TEUR_TAKALA', 'tiur_takala'], label: 'תיאור התקלה' },
      { keys: ['taarich_pirsum', 'TAARICH_PIRSUM'], label: 'תאריך פרסום', format: date },
      { keys: ['status_takala'], label: 'סטטוס' },
    ],
  },
]

export interface ResolvedField {
  label: string
  value: string
  hint?: string
}

/** Pull the fields of one section out of the merged record. */
export function resolveSection(section: SectionDef, merged: Record<string, unknown>): ResolvedField[] {
  const out: ResolvedField[] = []
  for (const f of section.fields) {
    for (const k of f.keys) {
      const raw = merged[k]
      if (isEmpty(raw)) continue
      const str = String(raw).trim()
      out.push({ label: f.label, value: f.format ? f.format(str) : str, hint: f.hint })
      break
    }
  }
  return out
}

/** Every key already claimed by a section — used to compute the leftovers. */
export const CLAIMED_KEYS = new Set(SECTIONS.flatMap((s) => s.fields.flatMap((f) => f.keys)))

/** Prettify an unmapped column name for the "additional data" section. */
export function prettifyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b(dt|nm|cd|ind)\b/gi, (m) =>
      ({ dt: 'תאריך', nm: 'שם', cd: 'קוד', ind: 'סימון' })[m.toLowerCase()] ?? m,
    )
    .trim()
}

/** Human labels for the most useful NHTSA vPIC VIN-decode fields. */
export const VIN_FIELDS: [string, string][] = [
  ['Make', 'יצרן (גלובלי)'],
  ['Model', 'דגם (גלובלי)'],
  ['ModelYear', 'שנת דגם'],
  ['Series', 'סדרה'],
  ['Trim', 'רמת גימור'],
  ['BodyClass', 'סוג מרכב'],
  ['VehicleType', 'סיווג'],
  ['DriveType', 'הנעה'],
  ['EngineCylinders', 'מספר צילינדרים'],
  ['DisplacementL', 'נפח מנוע (ליטר)'],
  ['EngineHP', 'הספק (כ״ס)'],
  ['FuelTypePrimary', 'סוג דלק'],
  ['TransmissionStyle', 'תיבת הילוכים'],
  ['Doors', 'מספר דלתות'],
  ['PlantCountry', 'ארץ הייצור (מפעל)'],
  ['PlantCity', 'עיר המפעל'],
  ['Manufacturer', 'יצרן רשום'],
  ['ABS', 'ABS'],
  ['ESC', 'בקרת יציבות (ESC)'],
  ['TractionControl', 'בקרת אחיזה'],
  ['AirBagLocFront', 'כריות אוויר קדמיות'],
  ['AirBagLocSide', 'כריות אוויר צד'],
  ['AirBagLocCurtain', 'כריות אוויר וילון'],
  ['SeatBeltsAll', 'חגורות בטיחות'],
  ['TPMS', 'חיישני לחץ אוויר'],
  ['BlindSpotMon', 'ניטור שטח מת'],
  ['ForwardCollisionWarning', 'התרעת התנגשות'],
  ['LaneDepartureWarning', 'התרעת סטייה מנתיב'],
  ['AdaptiveCruiseControl', 'בקרת שיוט אדפטיבית'],
  ['BackupCamera', 'מצלמת רוורס'],
  ['ParkAssist', 'עזר חניה'],
]
