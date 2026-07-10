import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import GlassPanel from '../components/cockpit/GlassPanel'
import { IconPhone, IconShield } from '../components/icons'
import { EmptyState, ListSkeleton } from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { repo } from '../data'
import { useCollection } from '../hooks/useCollection'
import { carDisplayName } from '../lib/reminders'
import { formatDate, formatPlate } from '../lib/utils'
import type { InsuranceRecord } from '../types'

const EMERGENCY = [
  { label: 'משטרה', num: '100' },
  { label: 'מד״א', num: '101' },
  { label: 'כבאות', num: '102' },
]

/** "Glovebox" — everything you need in a hurry (accident, police stop):
 *  plate, insurance, test, VIN and one-tap emergency dialing. */
export default function GloveboxPage() {
  const { id: carId } = useParams()
  const { cars } = useCars()
  const car = cars.find((c) => c.id === carId)

  const fetcher = useCallback((cid: string) => repo.listInsurances(cid), [])
  const { items, loading } = useCollection<InsuranceRecord>(carId, fetcher)

  // most-relevant insurance = the one furthest in the future (still valid)
  const insurance = [...items].sort((a, b) => b.endDate.localeCompare(a.endDate))[0]

  if (!car) {
    return (
      <div className="px-4">
        <PageHeader title="תא הכפפות" />
      </div>
    )
  }

  return (
    <div className="px-4">
      <PageHeader title="תא הכפפות" subtitle={carDisplayName(car)} />

      <div className="space-y-3 pb-8">
        {/* plate hero */}
        <GlassPanel className="text-center">
          <p className="text-sm font-semibold text-ink-3">{carDisplayName(car)}</p>
          <p
            className="mx-auto mt-2 w-fit rounded-xl bg-amber-300/90 px-5 py-2 text-3xl font-black tracking-widest text-black ring-1 ring-black/10"
            dir="ltr"
          >
            {formatPlate(car.plate)}
          </p>
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <span>
              <span className="text-ink-3">טסט: </span>
              <span className="font-black">{formatDate(car.testExpiry)}</span>
            </span>
            {car.vin && (
              <span>
                <span className="text-ink-3">שלדה: </span>
                <span className="font-black" dir="ltr">
                  {car.vin.slice(-6)}
                </span>
              </span>
            )}
          </div>
        </GlassPanel>

        {/* insurance */}
        {loading ? (
          <ListSkeleton rows={1} />
        ) : insurance ? (
          <GlassPanel>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/40 text-ink dark:bg-white/10">
                <IconShield size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black">
                  {insurance.kind} · {insurance.company}
                </p>
                <p className="text-sm text-ink-3">
                  {insurance.policyNumber ? `פוליסה ${insurance.policyNumber} · ` : ''}
                  עד {formatDate(insurance.endDate)}
                </p>
              </div>
            </div>
            {insurance.agentPhone && (
              <a
                href={`tel:${insurance.agentPhone}`}
                className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-accent text-lg font-black text-accent-ink shadow-card active:scale-[0.98]"
              >
                <IconPhone size={20} />
                חיוג לסוכן {insurance.agentName ? `· ${insurance.agentName}` : ''}
              </a>
            )}
          </GlassPanel>
        ) : (
          <EmptyState icon={<IconShield size={24} />} title="לא הוזן ביטוח" subtitle="הוסיפו פוליסה כדי שתופיע כאן בשעת חירום" />
        )}

        {/* emergency dialing */}
        <div>
          <p className="mb-2 px-1 text-sm font-bold text-ink-3">חירום — חיוג מהיר</p>
          <div className="grid grid-cols-3 gap-3">
            {EMERGENCY.map((e) => (
              <a
                key={e.num}
                href={`tel:${e.num}`}
                className="flex flex-col items-center gap-1 rounded-card bg-danger/90 py-4 text-white shadow-card active:scale-[0.97]"
              >
                <IconPhone size={24} />
                <span className="text-2xl font-black">{e.num}</span>
                <span className="text-xs font-bold">{e.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
