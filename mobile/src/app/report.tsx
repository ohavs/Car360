import { useLocalSearchParams } from 'expo-router'
import { printToFileAsync } from 'expo-print'
import { shareAsync } from 'expo-sharing'
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  ChevronDown,
  FileDown,
  FileText,
  Fuel,
  Search,
  Shield,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import { formatPlate } from '@shared/utils'
import { CLAIMED_KEYS, prettifyKey, resolveSection, SECTIONS, VIN_FIELDS, type SectionDef } from '@shared/vehicleFields'
import { buildVehicleReport, firstString, isEmpty, reportCache, type VehicleReport } from '@shared/vehicleReport'
import { useGarage } from '../data/CarsProvider'
import { readPref, writePref } from '../lib/storage'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import {
  Appear,
  AppBar,
  Button,
  Card,
  Chip,
  Plate,
  PlateField,
  ProgressBar,
  Screen,
  StatusChip,
  Text,
  Touchable,
  useSnackbar,
} from '../ui'

// the discovered data.gov.il sources are cached on the device for a day
reportCache.get = (key) => readPref<string | null>(key, null)
reportCache.set = (key, value) => writePref(key, value)

const ICONS: Record<SectionDef['icon'], LucideIcon> = {
  car: CarFront,
  calendar: CalendarDays,
  users: Users,
  fuel: Fuel,
  shield: Shield,
  wrench: Wrench,
  file: FileText,
  alert: AlertTriangle,
}

/** Everything public about a plate: the registry, recalls, disabled tag,
 *  and a worldwide VIN decode — for checking a car before buying it. */
export default function ReportScreen() {
  const params = useLocalSearchParams<{ plate?: string }>()
  const { cars } = useGarage()
  const snack = useSnackbar()
  const [plate, setPlate] = useState(params.plate ?? '')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [report, setReport] = useState<VehicleReport | null>(null)
  const [recent, setRecent] = useState<string[]>(() => readPref<string[]>('recentReports', []))
  const ran = useRef(false)

  const run = async (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 5) return snack('הזינו מספר רישוי מלא', { tone: 'error' })
    setPlate(digits)
    setLoading(true)
    setReport(null)
    setProgress({ done: 0, total: 0 })
    try {
      const r = await buildVehicleReport(digits, (done, total) => setProgress({ done, total }))
      setReport(r)
      if (r.hits.length === 0) snack('לא נמצאו רשומות למספר הזה', { tone: 'info' })
      else {
        const next = [digits, ...recent.filter((p) => p !== digits)].slice(0, 5)
        setRecent(next)
        writePref('recentReports', next)
      }
    } catch {
      snack('הבדיקה נכשלה — בדקו את החיבור לאינטרנט', { tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // arriving with ?plate= (from a car): check it straight away
  useEffect(() => {
    if (params.plate && !ran.current) {
      ran.current = true
      void run(params.plate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.plate])

  return (
    <Screen header={<AppBar title="דוח רכב" subtitle="בדיקה לפי מספר רישוי, מכל המאגרים הפתוחים" back />}>
      <Card style={styles.search}>
        <PlateField label="מספר רישוי" value={plate} onChangeText={setPlate} onSubmitEditing={() => void run(plate)} returnKeyType="search" />
        <Button label="בדיקה" icon={Search} loading={loading} onPress={() => void run(plate)} />
        {loading && progress.total > 0 && (
          <View style={styles.progress}>
            <ProgressBar value={progress.done / progress.total} />
            <Text variant="caption" tone="muted" align="center">
              סורק מאגרים… {progress.done}/{progress.total}
            </Text>
          </View>
        )}
        {!loading && (cars.length > 0 || recent.length > 0) && (
          <View style={styles.chips}>
            {cars.map((c) => (
              <Chip key={c.id} label={carDisplayName(c)} icon={CarFront} onPress={() => void run(c.plate)} />
            ))}
            {recent
              .filter((p) => !cars.some((c) => c.plate === p))
              .map((p) => (
                <Chip key={p} label={formatPlate(p)} onPress={() => void run(p)} />
              ))}
          </View>
        )}
      </Card>

      {report && !loading ? (
        <ReportBody report={report} />
      ) : !loading ? (
        <Text variant="caption" tone="muted" align="center">
          הדוח מאחד את מאגרי משרד התחבורה, הריקולים ותג הנכה, ופענוח בינלאומי של מספר השלדה — ומציג כל פרט שנמצא.
        </Text>
      ) : null}
    </Screen>
  )
}

function ReportBody({ report }: { report: VehicleReport }) {
  const snack = useSnackbar()
  const [exporting, setExporting] = useState(false)
  const m = report.merged
  const title = [firstString(m, ['tozeret_nm']), firstString(m, ['kinuy_mishari', 'degem_nm'])].filter(Boolean).join(' ') || 'רכב'
  const year = firstString(m, ['shnat_yitzur'])
  const hasRecall = report.hits.some((h) => /ריקול/.test(h.source.title))
  const hasDisabledTag = report.hits.some((h) => /נכה/.test(h.source.title))
  const cancelled = !isEmpty(m['bitul_dt']) || report.hits.some((h) => /ביטול|ירדו מהכביש/.test(h.source.title))

  const sections = useMemo(() => SECTIONS.map((s) => ({ def: s, fields: resolveSection(s, m) })).filter((s) => s.fields.length), [m])
  const extras = useMemo(() => {
    const bySource = new Map<string, { key: string; value: string }[]>()
    for (const hit of report.hits) {
      for (const [k, v] of Object.entries(hit.record)) {
        if (k === '_id' || k === 'rank' || CLAIMED_KEYS.has(k) || isEmpty(v)) continue
        if (k === hit.source.plateField || /^mispar_rechev$/i.test(k)) continue
        const list = bySource.get(hit.source.title) ?? []
        if (list.some((e) => e.key === k)) continue
        list.push({ key: k, value: String(v).trim() })
        bySource.set(hit.source.title, list)
      }
    }
    return [...bySource.entries()]
  }, [report.hits])
  const vinRows = useMemo(
    () => (report.vinDecode ? VIN_FIELDS.map(([k, label]) => ({ label, value: report.vinDecode![k] })).filter((r) => r.value) : []),
    [report.vinDecode],
  )
  const total = sections.reduce((n, s) => n + s.fields.length, 0) + extras.reduce((n, [, v]) => n + v.length, 0) + vinRows.length

  const exportPdf = async () => {
    setExporting(true)
    try {
      const html = reportHtml(title, year, report.plate, [
        ...sections.map((s) => ({ title: s.def.title, rows: s.fields.map((f) => [f.label, f.value] as const) })),
        ...(vinRows.length ? [{ title: 'פענוח מספר שלדה', rows: vinRows.map((r) => [r.label, r.value] as const) }] : []),
        ...extras.map(([source, rows]) => ({ title: `נתונים נוספים · ${source}`, rows: rows.map((r) => [prettifyKey(r.key), r.value] as const) })),
      ])
      const { uri } = await printToFileAsync({ html })
      await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `דוח רכב ${formatPlate(report.plate)}`, UTI: 'com.adobe.pdf' })
    } catch {
      snack('לא הצלחנו להכין את הקובץ', { tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  let i = 0
  return (
    <>
      <Appear index={i++}>
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <Text variant="headline">{title}</Text>
              {year ? (
                <Text variant="label" tone="muted">
                  שנת ייצור {year}
                </Text>
              ) : null}
            </View>
            <Plate plate={report.plate} />
          </View>
          <View style={styles.chips}>
            <StatusChip tone={cancelled ? 'danger' : 'ok'} label={cancelled ? 'רישום מבוטל / ירד מהכביש' : 'רכב פעיל'} />
            {hasRecall && <StatusChip tone="danger" label="ריקול פתוח" />}
            {hasDisabledTag && <StatusChip tone="warn" label="תג חניה לנכה" />}
            <StatusChip tone="neutral" label={`${total} פרטים`} />
            <StatusChip tone="neutral" label={`${report.matchedSources.length}/${report.queriedCount} מאגרים`} />
          </View>
          <Button label="שיתוף הדוח כ-PDF" icon={FileDown} variant="tonal" loading={exporting} onPress={() => void exportPdf()} />
        </Card>
      </Appear>

      {sections.map(({ def, fields }) => (
        <Appear key={def.id} index={i++}>
          <Section icon={ICONS[def.icon]} title={def.title} rows={fields.map((f) => ({ label: f.label, value: f.value, hint: f.hint }))} />
        </Appear>
      ))}
      {vinRows.length > 0 && (
        <Appear index={i++}>
          <Section icon={FileText} title="פענוח מספר שלדה (בינלאומי)" subtitle="נתוני יצרן לפי ה-VIN, כולל מערכות בטיחות" rows={vinRows} />
        </Appear>
      )}
      {extras.map(([source, rows]) => (
        <Appear key={source} index={i++}>
          <Section
            icon={Sparkles}
            title="נתונים נוספים"
            subtitle={source}
            collapsed
            rows={rows.map((r) => ({ label: prettifyKey(r.key), value: r.value }))}
          />
        </Appear>
      ))}
      <Text variant="caption" tone="muted">
        מקורות: {report.matchedSources.join(' · ')}
        {report.vinDecode ? ' · NHTSA vPIC' : ''}. הנתונים נמשכים ישירות מ-data.gov.il ומ-NHTSA, והם משקפים את הרשום במאגרים — לא תחליף
        לבדיקה מקצועית לפני קנייה.
      </Text>
    </>
  )
}

function Section({
  icon: Icon,
  title,
  subtitle,
  rows,
  collapsed = false,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  rows: { label: string; value: string; hint?: string }[]
  collapsed?: boolean
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(!collapsed)
  return (
    <Card padded={false}>
      <Touchable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.surfaceContainer }]}>
          <Icon size={18} color={colors.onSurface} strokeWidth={2} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" tone="muted">
          {rows.length}
        </Text>
        <ChevronDown size={18} color={colors.muted} style={open ? styles.flipped : undefined} />
      </Touchable>
      {open &&
        rows.map((r) => {
          const ltr = /^[\w\s./-]+$/.test(r.value) && /[A-Za-z0-9]/.test(r.value)
          return (
            <View key={r.label} style={[styles.row, { borderTopColor: colors.outline }]}>
              <View style={styles.label}>
                <Text variant="label" tone="muted">
                  {r.label}
                </Text>
                {r.hint ? (
                  <Text variant="caption" tone="muted">
                    {r.hint}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodyStrong" style={[styles.value, ltr && styles.ltr]}>
                {r.value}
              </Text>
            </View>
          )
        })}
    </Card>
  )
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function reportHtml(title: string, year: string | undefined, plate: string, sections: { title: string; rows: readonly (readonly [string, string])[] }[]) {
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>
  @page { margin: 16mm 14mm; }
  body { font-family: 'Heebo', Arial, sans-serif; color: #111; font-size: 12px; }
  h1 { font-size: 24px; font-weight: 900; margin: 0; }
  .plate { display: inline-block; background: #fcd34d; border: 2px solid #111; border-radius: 6px; padding: 2px 10px;
           font-weight: 900; font-size: 18px; letter-spacing: .12em; direction: ltr; margin-top: 6px; }
  h2 { font-size: 14px; font-weight: 900; margin: 18px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #eee; padding: 4px; vertical-align: top; }
  td:first-child { color: #666; width: 40%; }
  td:last-child { font-weight: 700; }
  footer { margin-top: 22px; color: #888; font-size: 10px; }
</style></head><body>
<div style="font-size:10px;font-weight:700;letter-spacing:.15em;color:#666">CAR360 · דוח רכב</div>
<h1>${esc(title)}${year ? ` · ${esc(year)}` : ''}</h1><span class="plate">${esc(formatPlate(plate))}</span>
${sections.map((s) => `<h2>${esc(s.title)}</h2><table>${s.rows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`).join('')}
<footer>הנתונים ממאגרי data.gov.il ו-NHTSA, כפי שהם רשומים. אינו תחליף לבדיקה מקצועית.</footer>
</body></html>`
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { gap: space.md },
  progress: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hero: { gap: space.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  sectionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flipped: { transform: [{ rotate: '180deg' }] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, textAlign: 'right' },
  ltr: { writingDirection: 'ltr' },
})
