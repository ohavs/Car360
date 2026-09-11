import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCars } from '../contexts/CarsContext'
import { list } from '../data/store'
import { carDisplayName } from '../lib/reminders'
import { cn, formatDate, formatPlate } from '../lib/utils'
import type { CarDocument, CustomReminder, InsuranceRecord, ServiceRecord } from '../types'
import {
  IconBell,
  IconCar,
  IconEdit,
  IconFile,
  IconHome,
  IconLifeBuoy,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShare,
  IconShield,
  IconSparkles,
  IconWrench,
} from './icons'
import { BottomSheet, Spinner } from './ui'

interface Hit {
  key: string
  icon: ReactNode
  title: string
  subtitle?: string
  to: string
  carId?: string
  group: string
}

/** Normalised haystack: lower-case, no punctuation, Hebrew geresh variants
 *  folded, so "צד ג'" matches "צד ג׳" and "12-345-67" matches "1234567". */
function norm(v: string): string {
  return v
    .toLowerCase()
    .replace(/["'׳״`]/g, '')
    .replace(/[-–—_.,/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const hay = norm(fields.filter(Boolean).join(' '))
  return norm(query)
    .split(' ')
    .filter(Boolean)
    .every((t) => hay.includes(t))
}

/** Quick search across every screen and every record: cars, services,
 *  insurance, documents, reminders — plus the app's own destinations, so the
 *  search box doubles as the fastest way to navigate. */
export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { cars, activeCarId, setActiveCarId } = useCars()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [data, setData] = useState<{
    services: ServiceRecord[]
    insurances: InsuranceRecord[]
    documents: CarDocument[]
    reminders: CustomReminder[]
  } | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // everything is served from the shared cache when it was already loaded
  useEffect(() => {
    let cancelled = false
    void Promise.all(
      cars.map((c) =>
        Promise.all([
          list('services', c.id),
          list('insurances', c.id),
          list('documents', c.id),
          list('reminders', c.id),
        ]),
      ),
    ).then((per) => {
      if (cancelled) return
      setData({
        services: per.flatMap((p) => p[0]),
        insurances: per.flatMap((p) => p[1]),
        documents: per.flatMap((p) => p[2]),
        reminders: per.flatMap((p) => p[3]),
      })
    })
    return () => {
      cancelled = true
    }
  }, [cars])

  const carName = (carId: string) => {
    const car = cars.find((c) => c.id === carId)
    return car ? carDisplayName(car) : ''
  }

  const destinations = useMemo<Hit[]>(() => {
    const active = activeCarId
    const forCar: Hit[] = active
      ? [
          { key: 'd-services', icon: <IconWrench size={18} />, title: 'טיפולים ותיקונים', subtitle: carName(active), to: `/car/${active}/services`, group: 'ניווט' },
          { key: 'd-insurance', icon: <IconShield size={18} />, title: 'ביטוחים', subtitle: carName(active), to: `/car/${active}/insurance`, group: 'ניווט' },
          { key: 'd-docs', icon: <IconFile size={18} />, title: 'מסמכים של הרכב', subtitle: carName(active), to: `/car/${active}/documents`, group: 'ניווט' },
          { key: 'd-glove', icon: <IconLifeBuoy size={18} />, title: 'תא כפפות (חירום)', subtitle: carName(active), to: `/car/${active}/glovebox`, group: 'ניווט' },
          { key: 'd-share', icon: <IconShare size={18} />, title: 'שיתוף הרכב', subtitle: carName(active), to: `/car/${active}/share`, group: 'ניווט' },
          { key: 'd-edit', icon: <IconEdit size={18} />, title: 'עריכת פרטי הרכב', subtitle: carName(active), to: `/car/${active}/edit`, group: 'ניווט' },
        ]
      : []
    return [
      { key: 'd-home', icon: <IconHome size={18} />, title: 'דף הבית', to: '/', group: 'ניווט' },
      { key: 'd-reminders', icon: <IconBell size={18} />, title: 'תזכורות', to: '/reminders', group: 'ניווט' },
      ...forCar,
      { key: 'd-alldocs', icon: <IconFile size={18} />, title: 'כל המסמכים', to: '/documents', group: 'ניווט' },
      { key: 'd-report', icon: <IconSearch size={18} />, title: 'דוח רכב לפי מספר רישוי', to: '/report', group: 'ניווט' },
      { key: 'd-new', icon: <IconPlus size={18} />, title: 'הוספת רכב', to: '/car/new', group: 'ניווט' },
      { key: 'd-settings', icon: <IconSettings size={18} />, title: 'הגדרות', to: '/settings', group: 'ניווט' },
      { key: 'd-design', icon: <IconSparkles size={18} />, title: 'עיצוב ותצוגה', to: '/settings/design', group: 'ניווט' },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCarId, cars])

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim()
    if (!q) return []
    const out: Hit[] = []

    for (const car of cars) {
      if (matches(q, carDisplayName(car), car.plate, car.make, car.model, car.vin, car.color))
        out.push({
          key: `car-${car.id}`,
          icon: <IconCar size={18} />,
          title: carDisplayName(car),
          subtitle: formatPlate(car.plate),
          to: '/',
          carId: car.id,
          group: 'רכבים',
        })
    }
    for (const r of data?.services ?? []) {
      if (matches(q, r.title, r.garage, r.notes))
        out.push({
          key: `svc-${r.id}`,
          icon: <IconWrench size={18} />,
          title: r.title,
          subtitle: `${carName(r.carId)} · ${formatDate(r.date)}${r.garage ? ` · ${r.garage}` : ''}`,
          to: `/car/${r.carId}/services`,
          carId: r.carId,
          group: 'טיפולים',
        })
    }
    for (const r of data?.insurances ?? []) {
      if (matches(q, r.company, r.kind, r.policyNumber, r.agentName, r.notes))
        out.push({
          key: `ins-${r.id}`,
          icon: <IconShield size={18} />,
          title: `${r.kind} · ${r.company}`,
          subtitle: `${carName(r.carId)} · עד ${formatDate(r.endDate)}`,
          to: `/car/${r.carId}/insurance`,
          carId: r.carId,
          group: 'ביטוחים',
        })
    }
    for (const d of data?.documents ?? []) {
      if (matches(q, d.title, d.category))
        out.push({
          key: `doc-${d.id}`,
          icon: <IconFile size={18} />,
          title: d.title,
          subtitle: `${carName(d.carId)} · ${d.category}`,
          to: `/car/${d.carId}/documents`,
          carId: d.carId,
          group: 'מסמכים',
        })
    }
    for (const r of data?.reminders ?? []) {
      if (!r.done && matches(q, r.title))
        out.push({
          key: `rem-${r.id}`,
          icon: <IconBell size={18} />,
          title: r.title,
          subtitle: `${carName(r.carId)} · ${formatDate(r.dueDate)}`,
          to: '/reminders',
          carId: r.carId,
          group: 'תזכורות',
        })
    }
    for (const d of destinations) {
      if (matches(q, d.title, d.subtitle)) out.push(d)
    }
    return out.slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cars, data, destinations])

  const shown = query.trim() ? hits : destinations.slice(0, 8)
  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>()
    for (const h of shown) {
      const arr = map.get(h.group) ?? []
      arr.push(h)
      map.set(h.group, arr)
    }
    return [...map.entries()]
  }, [shown])

  const go = (hit: Hit) => {
    if (hit.carId) setActiveCarId(hit.carId)
    onClose()
    navigate(hit.to)
  }

  return (
    <BottomSheet title="חיפוש מהיר" onClose={onClose}>
      <div className="space-y-4">
        <div className="field-well flex min-h-13 items-center gap-2 rounded-field bg-white/60 px-4 ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-cta dark:bg-white/10 dark:ring-white/15">
          <IconSearch size={19} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && shown[0]) go(shown[0])
            }}
            placeholder="רכב, טיפול, ביטוח, מסמך, מסך…"
            aria-label="חיפוש באפליקציה"
            className="w-full bg-transparent text-base font-medium text-ink placeholder:font-normal placeholder:text-ink-3 focus:outline-none"
          />
        </div>

        {query.trim() && !data ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-3">לא נמצאו תוצאות ל״{query}״</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <p className="mb-1.5 px-1 text-xs font-bold text-ink-3">
                  {query.trim() ? group : 'מעבר מהיר'}
                </p>
                <div className="overflow-hidden rounded-card bg-card ring-1 ring-line">
                  {items.map((h, i) => (
                    <button
                      key={h.key}
                      onClick={() => go(h)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-3 text-start active:bg-card-2',
                        i > 0 && 'border-t border-line',
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink-2">
                        {h.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{h.title}</span>
                        {h.subtitle && (
                          <span className="block truncate text-xs text-ink-3">{h.subtitle}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
