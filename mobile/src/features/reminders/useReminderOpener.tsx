import { useRouter } from 'expo-router'
import { useState } from 'react'
import type { Car, CustomReminder, DerivedReminder } from '@shared/types'
import { routeForReminder } from '../../data/reminders'
import { TestSheet } from '../cars/TestSheet'
import { ReminderSheet } from './ReminderSheet'

type Open = { kind: 'test' | 'license'; carId: string } | { kind: 'custom'; reminder: CustomReminder } | null

/**
 * A tap on a reminder opens what it is about right there — the test date in
 * a sheet, your own reminder in its editor — and only goes to another screen
 * for the ones that live there (a policy, a service).
 */
export function useReminderOpener(cars: Car[], customs: CustomReminder[], activeCarId?: string) {
  const router = useRouter()
  const [open, setOpen] = useState<Open>(null)

  const openReminder = (r: DerivedReminder) => {
    if (r.source === 'test' || r.source === 'license') return setOpen({ kind: r.source, carId: r.carId })
    const custom = r.source === 'custom' ? customs.find((c) => c.id === r.customId && c.carId === r.carId) : undefined
    if (custom) return setOpen({ kind: 'custom', reminder: custom })
    router.push(routeForReminder(r) as never)
  }

  const close = () => setOpen(null)
  // the live car, so the sheet shows a change the moment it's saved
  const car = open && open.kind !== 'custom' ? cars.find((c) => c.id === open.carId) : undefined

  const sheet =
    open?.kind === 'custom' ? (
      <ReminderSheet key={open.reminder.id} cars={cars} defaultCarId={activeCarId} reminder={open.reminder} onClose={close} />
    ) : car && open ? (
      <TestSheet key={`${open.kind}:${car.id}`} car={car} kind={open.kind} onClose={close} />
    ) : null

  return {
    openReminder,
    openTest: (carId: string) => setOpen({ kind: 'test', carId }),
    sheet,
  }
}
