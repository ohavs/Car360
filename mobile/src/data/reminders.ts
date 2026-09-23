import { collection, getFirestore, onSnapshot } from '@react-native-firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { deriveReminders, type CarRecords } from '@shared/reminders'
import type { Car, CustomReminder, DerivedReminder } from '@shared/types'

const SUBS = ['insurances', 'services', 'reminders'] as const

/** Every derived reminder across the given cars, live. One listener per
 *  car × record type — a handful for a family garage. */
export function useAllReminders(cars: Car[]): {
  reminders: DerivedReminder[]
  /** the user's own reminders, done ones included (for editing) */
  customs: CustomReminder[]
  loading: boolean
} {
  const [records, setRecords] = useState<Record<string, Partial<CarRecords>>>({})
  const ids = cars.map((c) => c.id).join(',')

  useEffect(() => {
    if (!ids) return
    const db = getFirestore()
    const unsubs = ids.split(',').flatMap((carId) =>
      SUBS.map((sub) =>
        onSnapshot(
          collection(db, 'cars', carId, sub),
          (snap) =>
            setRecords((prev) => ({
              ...prev,
              [carId]: { ...prev[carId], [sub]: snap.docs.map((d) => d.data()) },
            })),
          // a failing listener must not leave the list loading forever
          () => setRecords((prev) => ({ ...prev, [carId]: { ...prev[carId], [sub]: [] } })),
        ),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [ids])

  return useMemo(() => {
    const loading = cars.some((c) => SUBS.some((s) => records[c.id]?.[s] === undefined))
    const reminders = cars
      .flatMap((car) => {
        const r = records[car.id]
        return deriveReminders(car, {
          insurances: r?.insurances ?? [],
          services: r?.services ?? [],
          reminders: r?.reminders ?? [],
        })
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
    const customs = cars.flatMap((car) => (records[car.id]?.reminders ?? []) as CustomReminder[])
    return { reminders, customs, loading }
  }, [cars, records])
}

/** Where a reminder is dealt with, so one tap lands on the right screen. */
export function routeForReminder(r: DerivedReminder): string {
  switch (r.source) {
    case 'insurance':
      return `/car/${r.carId}/insurance`
    case 'service':
      return `/car/${r.carId}/services`
    case 'custom':
      return '/reminders'
    default:
      return `/car/${r.carId}`
  }
}
