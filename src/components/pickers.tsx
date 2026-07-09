import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { tapHaptic } from '../lib/haptics'
import { cn, formatDate } from '../lib/utils'
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from './icons'
import { BottomSheet, Button, spring } from './ui'

/* All pickers below render their own fully-designed UI (calendar / wheel /
   option list) inside a BottomSheet and use the app's semantic tokens
   (bg-card, ring-line, bg-cta…), so they inherit every design language —
   minimal, glass, neu, and any future skin — for free. No native OS pickers. */

const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
const HE_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}
function parseISO(iso?: string): { y: number; m: number; d: number } | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m: m - 1, d }
}

/* ---------- Shared field-trigger button ---------- */

function FieldTrigger({
  filled,
  onClick,
  onClear,
  children,
  icon,
}: {
  filled: boolean
  onClick: () => void
  onClear?: () => void
  children: ReactNode
  icon: ReactNode
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      transition={spring}
      onClick={onClick}
      className="field-well flex min-h-13 w-full items-center justify-between gap-3 rounded-field bg-card px-4 text-start text-base font-medium text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-ink"
    >
      <span className={cn('truncate', !filled && 'font-normal text-ink-3')}>{children}</span>
      <span className="flex items-center gap-1.5">
        {filled && onClear && (
          <span
            role="button"
            aria-label="ניקוי"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="flex size-7 items-center justify-center rounded-full bg-card-2 text-ink-3"
          >
            <IconX size={13} />
          </span>
        )}
        <span className="flex size-9 items-center justify-center rounded-full bg-card-2 text-ink-2">
          {icon}
        </span>
      </span>
    </motion.button>
  )
}

/* ==================== DatePicker ==================== */

export function DateInput({
  value,
  onChange,
  placeholder = 'בחירת תאריך',
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: string
  max?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <FieldTrigger
        filled={Boolean(value)}
        onClick={() => setOpen(true)}
        onClear={() => onChange('')}
        icon={<IconCalendar size={17} />}
      >
        {value ? formatDate(value) : placeholder}
      </FieldTrigger>
      <AnimatePresence>
        {open && (
          <CalendarSheet
            value={value}
            min={min}
            max={max}
            onClose={() => setOpen(false)}
            onPick={(v) => {
              onChange(v)
              setOpen(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function CalendarSheet({
  value,
  min,
  max,
  onClose,
  onPick,
}: {
  value: string
  min?: string
  max?: string
  onClose: () => void
  onPick: (v: string) => void
}) {
  const sel = parseISO(value)
  const today = new Date()
  const [view, setView] = useState(() => ({
    y: sel?.y ?? today.getFullYear(),
    m: sel?.m ?? today.getMonth(),
  }))
  const [mode, setMode] = useState<'days' | 'years'>('days')

  const minP = parseISO(min)
  const maxP = parseISO(max)
  const disabled = (iso: string) => Boolean((min && iso < min) || (max && iso > max))

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay() // 0=Sun
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const cells: (number | null)[] = Array.from({ length: first }, () => null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [view])

  const step = (delta: number) => {
    tapHaptic()
    setView((v) => {
      const m = v.m + delta
      if (m < 0) return { y: v.y - 1, m: 11 }
      if (m > 11) return { y: v.y + 1, m: 0 }
      return { ...v, m }
    })
  }

  const years = useMemo(() => {
    const base = today.getFullYear()
    const from = minP?.y ?? base - 100
    const to = maxP?.y ?? base + 15
    return Array.from({ length: to - from + 1 }, (_, i) => to - i)
  }, [minP, maxP, today])

  const todayISOStr = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <BottomSheet title="בחירת תאריך" onClose={onClose}>
      <div className="rounded-card bg-card p-4 shadow-card">
        {/* header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="חודש קודם"
            onClick={() => step(-1)}
            className="flex size-10 items-center justify-center rounded-full bg-card-2 text-ink active:scale-90"
          >
            <IconChevronRight size={20} />
          </button>
          <button
            onClick={() => setMode((x) => (x === 'days' ? 'years' : 'days'))}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-black active:scale-95"
          >
            {HE_MONTHS[view.m]} {view.y}
            <IconChevronDown size={16} className={cn('transition-transform', mode === 'years' && 'rotate-180')} />
          </button>
          <button
            aria-label="חודש הבא"
            onClick={() => step(1)}
            className="flex size-10 items-center justify-center rounded-full bg-card-2 text-ink active:scale-90"
          >
            <IconChevronLeft size={20} />
          </button>
        </div>

        {mode === 'years' ? (
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto py-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setView((v) => ({ ...v, y }))
                  setMode('days')
                  tapHaptic()
                }}
                className={cn(
                  'rounded-xl py-2.5 text-sm font-bold transition-colors',
                  y === view.y ? 'bg-cta text-white' : 'bg-card-2 text-ink-2',
                )}
              >
                {y}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-7">
              {HE_WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-center text-xs font-bold text-ink-3">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                if (d === null) return <span key={i} />
                const iso = toISO(view.y, view.m, d)
                const isSel = iso === value
                const isToday = iso === todayISOStr
                const off = disabled(iso)
                return (
                  <motion.button
                    key={i}
                    whileTap={off ? undefined : { scale: 0.85 }}
                    disabled={off}
                    onClick={() => {
                      tapHaptic()
                      onPick(iso)
                    }}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition-colors',
                      isSel && 'bg-cta text-white shadow-card',
                      !isSel && isToday && 'ring-2 ring-cta/40 text-ink',
                      !isSel && !isToday && 'text-ink hover:bg-card-2',
                      off && 'opacity-25',
                    )}
                  >
                    {d}
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => onPick(todayISOStr)} disabled={disabled(todayISOStr)}>
          היום
        </Button>
        <Button variant="primary" onClick={onClose}>
          סגירה
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ==================== TimePicker (wheel) ==================== */

export function TimeInput({
  value,
  onChange,
  placeholder = 'בחירת שעה',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <FieldTrigger
        filled={Boolean(value)}
        onClick={() => setOpen(true)}
        onClear={() => onChange('')}
        icon={<ClockIcon />}
      >
        {value || placeholder}
      </FieldTrigger>
      <AnimatePresence>
        {open && (
          <TimeSheet
            value={value}
            onClose={() => setOpen(false)}
            onPick={(v) => {
              onChange(v)
              setOpen(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ClockIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

const ITEM_H = 44

function Wheel({
  count,
  value,
  onChange,
  format = (n) => pad(n),
}: {
  count: number
  value: number
  onChange: (n: number) => void
  format?: (n: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastVal = useRef(value)

  // center the initial value without emitting a change
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = value * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)))
      el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      if (idx !== lastVal.current) {
        lastVal.current = idx
        tapHaptic()
        onChange(idx)
      }
    }, 90)
  }

  return (
    <div className="relative h-[132px] flex-1 overflow-hidden">
      {/* center highlight band */}
      <div className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2" style={{ height: ITEM_H }}>
        <div className="h-full rounded-xl bg-card-2" />
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto"
        style={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}
      >
        {Array.from({ length: count }, (_, n) => (
          <button
            key={n}
            onClick={() => {
              ref.current?.scrollTo({ top: n * ITEM_H, behavior: 'smooth' })
            }}
            className={cn(
              'flex w-full snap-center items-center justify-center text-xl font-black tabular-nums transition-colors',
              n === value ? 'text-ink' : 'text-ink-3',
            )}
            style={{ height: ITEM_H }}
          >
            {format(n)}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimeSheet({
  value,
  onClose,
  onPick,
}: {
  value: string
  onClose: () => void
  onPick: (v: string) => void
}) {
  const [h, setH] = useState(() => Number(value?.split(':')[0]) || 8)
  const [m, setM] = useState(() => Number(value?.split(':')[1]) || 0)

  return (
    <BottomSheet title="בחירת שעה" onClose={onClose}>
      <div className="rounded-card bg-card p-4 shadow-card">
        <div className="flex items-stretch gap-2" dir="ltr">
          <Wheel count={24} value={h} onChange={setH} />
          <div className="flex items-center text-2xl font-black text-ink-3">:</div>
          <Wheel count={60} value={m} onChange={setM} />
        </div>
      </div>
      <Button className="mt-3 w-full" onClick={() => onPick(`${pad(h)}:${pad(m)}`)}>
        אישור · {pad(h)}:{pad(m)}
      </Button>
    </BottomSheet>
  )
}

/* ==================== Dropdown (custom Select) ==================== */

export interface Option {
  value: string
  label: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'בחירה…',
  title = 'בחירה',
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <>
      <FieldTrigger
        filled={Boolean(current)}
        onClick={() => setOpen(true)}
        icon={<IconChevronDown size={17} />}
      >
        {current?.label ?? placeholder}
      </FieldTrigger>
      <AnimatePresence>
        {open && (
          <BottomSheet title={title} onClose={() => setOpen(false)}>
            <div className="grid gap-1.5">
              {options.map((o) => {
                const active = o.value === value
                return (
                  <motion.button
                    key={o.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      tapHaptic()
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-3.5 text-start text-base font-bold transition-colors',
                      active ? 'bg-cta-soft text-cta ring-1 ring-cta/30' : 'bg-card text-ink shadow-card',
                    )}
                  >
                    {o.label}
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
                        <IconCheck size={18} />
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </>
  )
}
