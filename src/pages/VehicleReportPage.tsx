import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import GlassPanel from '../components/cockpit/GlassPanel'
import {
  IconAlert,
  IconCalendar,
  IconCar,
  IconCheck,
  IconDownload,
  IconFile,
  IconFuel,
  IconSearch,
  IconShield,
  IconSparkles,
  IconUsers,
  IconWrench,
} from '../components/icons'
import { Badge, Button, Input, Spinner, listItem, listStagger } from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import {
  CLAIMED_KEYS,
  SECTIONS,
  VIN_FIELDS,
  prettifyKey,
  resolveSection,
  type SectionDef,
} from '../lib/vehicleFields'
import { buildVehicleReport, firstString, isEmpty, type VehicleReport } from '../lib/vehicleReport'
import { cn, formatPlate } from '../lib/utils'

const ICONS = {
  car: IconCar,
  calendar: IconCalendar,
  users: IconUsers,
  fuel: IconFuel,
  shield: IconShield,
  wrench: IconWrench,
  file: IconFile,
  alert: IconAlert,
} as const

export default function VehicleReportPage() {
  const [params, setParams] = useSearchParams()
  const { cars, activeCar } = useCars()
  const { toast } = useToast()
  const [plate, setPlate] = useState(params.get('plate') ?? '')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [report, setReport] = useState<VehicleReport | null>(null)
  const ranFor = useRef<string | null>(null)

  const run = async (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 5) {
      toast('הזינו מספר רישוי תקין', 'error')
      return
    }
    // claim this plate so the ?plate= sync effect doesn't run it a second time
    ranFor.current = digits
    setLoading(true)
    setReport(null)
    setProgress({ done: 0, total: 0 })
    try {
      const r = await buildVehicleReport(digits, (done, total) => setProgress({ done, total }))
      setReport(r)
      setParams({ plate: digits }, { replace: true })
      if (r.hits.length === 0) toast('לא נמצאו רשומות למספר הזה', 'info')
    } catch {
      toast('החיפוש נכשל — בדקו חיבור לאינטרנט', 'error')
    } finally {
      setLoading(false)
    }
  }

  // auto-run when arriving with ?plate=
  useEffect(() => {
    const p = params.get('plate')
    if (p && ranFor.current !== p) {
      ranFor.current = p
      void run(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="px-4 print:px-0">
      <div className="print:hidden">
        <PageHeader title="דוח רכב" subtitle="בדיקה מלאה לפי מספר רישוי — מכל המאגרים הפתוחים" />
      </div>

      {/* search */}
      <GlassPanel className="print:hidden !p-4">
        <label className="mb-2 block text-sm font-bold text-ink-2">מספר רישוי</label>
        <div className="flex gap-2">
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void run(plate)}
            placeholder="12-345-67"
            inputMode="numeric"
            dir="ltr"
            className="flex-1 text-center text-lg font-black tracking-widest"
          />
          <Button onClick={() => void run(plate)} disabled={loading} className="!px-5">
            {loading ? <Spinner className="size-5 border-2 border-white/30 border-t-white" /> : <IconSearch size={20} />}
            בדיקה
          </Button>
        </div>

        {/* quick pick from the user's garage */}
        {cars.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {cars.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setPlate(c.plate)
                  void run(c.plate)
                }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors',
                  activeCar?.id === c.id ? 'bg-cta-soft text-cta ring-cta/30' : 'bg-card-2 text-ink-2 ring-line',
                )}
              >
                {c.nickname || `${c.make} ${c.model}`.trim() || formatPlate(c.plate)}
              </button>
            ))}
          </div>
        )}

        {loading && progress.total > 0 && (
          <p className="mt-3 text-center text-xs font-semibold text-ink-3">
            סורק מאגרים… {progress.done}/{progress.total}
          </p>
        )}
      </GlassPanel>

      {report && !loading && <ReportBody report={report} />}

      {!report && !loading && (
        <p className="mt-6 px-2 text-center text-sm leading-relaxed text-ink-3 print:hidden">
          הדוח מאחד נתונים ממאגרי משרד התחבורה הפתוחים, מאגר הריקולים, תג נכה,
          פענוח מספר שלדה בינלאומי ועוד — ומציג כל פרט שנמצא.
        </p>
      )}
    </div>
  )
}

function ReportBody({ report }: { report: VehicleReport }) {
  const { toast } = useToast()
  const m = report.merged

  const title =
    [firstString(m, ['tozeret_nm']), firstString(m, ['kinuy_mishari', 'degem_nm'])]
      .filter(Boolean)
      .join(' ') || 'רכב'
  const year = firstString(m, ['shnat_yitzur'])

  // status flags
  const hasRecall = report.hits.some((h) => /ריקול/.test(h.source.title))
  const hasDisabledTag = report.hits.some((h) => /נכה/.test(h.source.title))
  const cancelled = !isEmpty(m['bitul_dt']) || report.hits.some((h) => /ביטול|ירדו מהכביש/.test(h.source.title))

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({ def: s, fields: resolveSection(s, m) })).filter((s) => s.fields.length > 0),
    [m],
  )

  // every field not claimed by a section, grouped by the source it came from
  const extras = useMemo(() => {
    const bySource = new Map<string, { key: string; value: string }[]>()
    for (const hit of report.hits) {
      for (const [k, v] of Object.entries(hit.record)) {
        if (k === '_id' || k === 'rank' || CLAIMED_KEYS.has(k) || isEmpty(v)) continue
        // the plate itself is already the report headline
        if (k === hit.source.plateField || /^mispar_rechev$/i.test(k)) continue
        const list = bySource.get(hit.source.title) ?? []
        if (list.some((e) => e.key === k)) continue
        list.push({ key: k, value: String(v).trim() })
        bySource.set(hit.source.title, list)
      }
    }
    return [...bySource.entries()]
  }, [report.hits])

  const vinRows = useMemo(() => {
    if (!report.vinDecode) return []
    return VIN_FIELDS.map(([k, label]) => ({ label, value: report.vinDecode![k] })).filter((r) => r.value)
  }, [report.vinDecode])

  const totalFields =
    sections.reduce((n, s) => n + s.fields.length, 0) +
    extras.reduce((n, [, v]) => n + v.length, 0) +
    vinRows.length

  const exportPdf = () => {
    toast('נפתח חלון הדפסה — בחרו "שמירה כ-PDF"', 'info')
    setTimeout(() => window.print(), 350)
  }

  return (
    <motion.div variants={listStagger} initial="hidden" animate="show" className="mt-4 space-y-3 pb-8">
      {/* hero */}
      <motion.div variants={listItem}>
        <GlassPanel className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-tight">{title}</h2>
              {year && <p className="mt-0.5 text-sm font-bold text-ink-3">שנת ייצור {year}</p>}
            </div>
            <p
              className="shrink-0 whitespace-nowrap rounded-lg bg-amber-300/90 px-3 py-1.5 text-lg font-black tracking-[0.15em] text-black ring-1 ring-black/10"
              dir="ltr"
            >
              {formatPlate(report.plate)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={cancelled ? 'danger' : 'ok'}>{cancelled ? 'רישום מבוטל / ירד מהכביש' : 'רכב פעיל'}</Badge>
            {hasRecall && <Badge tone="danger">ריקול פתוח</Badge>}
            {hasDisabledTag && <Badge tone="warn">תג חניה לנכה</Badge>}
            <Badge>{totalFields} פרטים</Badge>
            <Badge>{report.matchedSources.length}/{report.queriedCount} מאגרים</Badge>
          </div>

          <button
            onClick={exportPdf}
            className="print:hidden mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-black text-accent-ink shadow-card active:scale-[0.98]"
          >
            <IconDownload size={18} />
            ייצוא הדוח כ-PDF
          </button>
        </GlassPanel>
      </motion.div>

      {/* mapped sections */}
      {sections.map(({ def, fields }) => (
        <motion.div variants={listItem} key={def.id}>
          <Section def={def}>
            <dl className="divide-y divide-white/10 dark:divide-white/5">
              {fields.map((f) => (
                <Row key={f.label} label={f.label} value={f.value} hint={f.hint} />
              ))}
            </dl>
          </Section>
        </motion.div>
      ))}

      {/* global VIN decode */}
      {vinRows.length > 0 && (
        <motion.div variants={listItem}>
          <Section
            def={{ id: 'vin', title: 'פענוח מספר שלדה (בינלאומי)', icon: 'file', fields: [] }}
            subtitle="נתוני יצרן גלובליים לפי ה-VIN — כולל מערכות בטיחות ומפעל הייצור"
          >
            <dl className="divide-y divide-white/10 dark:divide-white/5">
              {vinRows.map((r) => (
                <Row key={r.label} label={r.label} value={r.value} />
              ))}
            </dl>
          </Section>
        </motion.div>
      )}

      {/* leftovers — nothing is dropped */}
      {extras.map(([source, rows]) => (
        <motion.div variants={listItem} key={source}>
          <Section
            def={{ id: source, title: 'נתונים נוספים', icon: 'sparkles' as never, fields: [] }}
            subtitle={source}
          >
            <dl className="divide-y divide-white/10 dark:divide-white/5">
              {rows.map((r) => (
                <Row key={r.key} label={prettifyKey(r.key)} value={r.value} mono />
              ))}
            </dl>
          </Section>
        </motion.div>
      ))}

      {/* sources */}
      <motion.div variants={listItem}>
        <GlassPanel className="!p-4">
          <p className="flex items-center gap-2 text-sm font-black">
            <IconCheck size={16} className="text-ok" />
            מקורות המידע
          </p>
          <ul className="mt-2 space-y-1">
            {report.matchedSources.map((s) => (
              <li key={s} className="text-xs font-semibold text-ink-2">
                • {s}
              </li>
            ))}
            {report.vinDecode && <li className="text-xs font-semibold text-ink-2">• NHTSA vPIC — פענוח VIN</li>}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            הנתונים נמשכים ישירות ממאגרי data.gov.il של משרד התחבורה ומ-NHTSA, במצב קריאה בלבד.
            הדוח משקף את הרשום במאגרים ואינו תחליף לבדיקה מקצועית לפני קנייה.
          </p>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}

function Section({
  def,
  subtitle,
  children,
}: {
  def: SectionDef | { id: string; title: string; icon: string; fields: [] }
  subtitle?: string
  children: React.ReactNode
}) {
  const Icon = ICONS[def.icon as keyof typeof ICONS] ?? IconSparkles
  return (
    <GlassPanel className="!p-0 print:break-inside-avoid">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/50 text-ink dark:bg-white/10">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-black leading-tight">{def.title}</h3>
          {subtitle && <p className="truncate text-[11px] font-semibold text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {children}
    </GlassPanel>
  )
}

function Row({
  label,
  value,
  hint,
  mono,
}: {
  label: string
  value: string
  hint?: string
  mono?: boolean
}) {
  const ltr = /^[\w\s./-]+$/.test(value) && /[A-Za-z0-9]/.test(value)
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-sm font-bold text-ink-3">
        {label}
        {hint && <span className="mt-0.5 block text-[10px] font-medium text-ink-3/70">{hint}</span>}
      </dt>
      <dd
        className={cn('min-w-0 break-words text-end text-sm font-black', mono && 'font-mono text-xs')}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </dd>
    </div>
  )
}
