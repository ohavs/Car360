import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  IconBell,
  IconCar,
  IconFile,
  IconSearch,
  IconShield,
  IconWrench,
  IconX,
} from './icons'
import { Spinner } from './ui'
import { useCars } from '../contexts/CarsContext'
import { repo } from '../data'
import { carDisplayName } from '../lib/reminders'
import { formatDate, formatPlate } from '../lib/utils'
import type { Car } from '../types'

type Kind = 'car' | 'service' | 'insurance' | 'document' | 'reminder'

interface Hit {
  id: string
  kind: Kind
  title: string
  subtitle: string
  carName: string
  to: string
  /** everything searchable, lowercased once at index time */
  haystack: string
}

const KIND_META: Record<Kind, { label: string; icon: typeof IconCar }> = {
  car: { label: 'רכבים', icon: IconCar },
  service: { label: 'טיפולים', icon: IconWrench },
  insurance: { label: 'ביטוחים', icon: IconShield },
  document: { label: 'מסמכים', icon: IconFile },
  reminder: { label: 'תזכורות', icon: IconBell },
}

const ORDER: Kind[] = ['car', 'service', 'insurance', 'document', 'reminder']

function norm(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/** Build one flat, searchable index across every car's records. */
async function buildIndex(cars: Car[]): Promise<Hit[]> {
  const perCar = await Promise.all(
    cars.map(async (car) => {
      const name = carDisplayName(car)
      const [services, insurances, documents, reminders] = await Promise.all([
        repo.listServices(car.id),
        repo.listInsurances(car.id),
        repo.listDocuments(car.id),
        repo.listReminders(car.id),
      ])
      const hits: Hit[] = []

      hits.push({
        id: `car:${car.id}`,
        kind: 'car',
        title: name,
        subtitle: formatPlate(car.plate),
        carName: name,
        to: `/car/${car.id}/edit`,
        haystack: norm(name, car.plate, car.make, car.model, car.nickname, car.vin, car.color, car.year),
      })

      for (const s of services)
        hits.push({
          id: `svc:${s.id}`,
          kind: 'service',
          title: s.title,
          subtitle: [formatDate(s.date), s.garage].filter(Boolean).join(' · '),
          carName: name,
          to: `/car/${car.id}/services`,
          haystack: norm(s.title, s.garage, s.notes, s.date, name),
        })

      for (const i of insurances)
        hits.push({
          id: `ins:${i.id}`,
          kind: 'insurance',
          title: `${i.kind} · ${i.company}`,
          subtitle: `עד ${formatDate(i.endDate)}`,
          carName: name,
          to: `/car/${car.id}/insurance`,
          haystack: norm(i.company, i.kind, i.policyNumber, i.agentName, i.notes, name),
        })

      for (const d of documents)
        hits.push({
          id: `doc:${d.id}`,
          kind: 'document',
          title: d.title,
          subtitle: d.category,
          carName: name,
          to: `/car/${car.id}/documents`,
          haystack: norm(d.title, d.category, name),
        })

      for (const r of reminders)
        if (!r.done)
          hits.push({
            id: `rem:${r.id}`,
            kind: 'reminder',
            title: r.title,
            subtitle: formatDate(r.dueDate),
            carName: name,
            to: '/reminders',
            haystack: norm(r.title, r.dueDate, name),
          })

      return hits
    }),
  )
  return perCar.flat()
}

/** Search everything — plate, garage, policy, document, reminder — from
 *  anywhere, instead of remembering which screen holds it. */
export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { cars } = useCars()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [index, setIndex] = useState<Hit[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void buildIndex(cars)
      .then((h) => !cancelled && setIndex(h))
      .catch(() => !cancelled && setIndex([]))
    return () => {
      cancelled = true
    }
  }, [cars])

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = orig
    }
  }, [onClose])

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0 || !index) return []
    // every term must appear somewhere — lets "הראל מקיף" narrow properly
    return index.filter((h) => terms.every((t) => h.haystack.includes(t))).slice(0, 40)
  }, [q, index])

  const grouped = useMemo(() => {
    const by = new Map<Kind, Hit[]>()
    for (const h of results) by.set(h.kind, [...(by.get(h.kind) ?? []), h])
    return ORDER.filter((k) => by.has(k)).map((k) => [k, by.get(k)!] as const)
  }, [results])

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[65] flex flex-col bg-canvas"
      dir="rtl"
    >
      {/* search bar */}
      <div className="flex items-center gap-2 px-4 py-3 pt-safe">
        <div className="field-well flex min-h-13 flex-1 items-center gap-2 rounded-field bg-white/60 px-4 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/15">
          <IconSearch size={18} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש רכב, מוסך, פוליסה, מסמך…"
            className="w-full bg-transparent text-base font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="ניקוי" className="shrink-0 text-ink-3 active:scale-90">
              <IconX size={16} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 px-1 text-sm font-bold text-ink-2 active:opacity-70"
        >
          ביטול
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {index === null ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : q.trim() === '' ? (
          <p className="px-1 py-10 text-center text-sm leading-relaxed text-ink-3">
            מחפשים לפי מספר רישוי, שם מוסך, חברת ביטוח,
            <br />
            מספר פוליסה, שם מסמך או תזכורת.
          </p>
        ) : results.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-ink-3">לא נמצאו תוצאות עבור “{q}”</p>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-5 pt-1">
              {grouped.map(([kind, hits]) => {
                const Icon = KIND_META[kind].icon
                return (
                  <motion.section key={kind} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-black text-ink-3">
                      <Icon size={14} />
                      {KIND_META[kind].label}
                      <span className="font-bold">({hits.length})</span>
                    </p>
                    <div className="overflow-hidden rounded-card bg-card ring-1 ring-line">
                      {hits.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => go(h.to)}
                          className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-start last:border-b-0 active:opacity-70"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{h.title}</span>
                            <span className="block truncate text-xs font-semibold text-ink-3">
                              {h.subtitle}
                              {h.kind !== 'car' && ` · ${h.carName}`}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>,
    document.body,
  )
}
