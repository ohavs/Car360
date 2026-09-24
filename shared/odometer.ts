/** Odometer knowledge from everything that carries a reading, and the
 *  km-based service estimate. Pure — shared by both apps. */
import type { Car, ExpenseRecord, ServiceRecord } from './types'
import { todayISO } from './utils'

export interface Reading {
  date: string
  km: number
}

const DAY = 86_400_000
const toTime = (iso: string) => new Date(`${iso}T00:00:00`).getTime()

/** Every dated reading, oldest first. */
export function readings(car: Car, services: ServiceRecord[], expenses: ExpenseRecord[] = []): Reading[] {
  const out: Reading[] = []
  if (car.odometer && car.odometerAt) out.push({ date: car.odometerAt, km: car.odometer })
  for (const s of services) if (s.odometer && s.date) out.push({ date: s.date, km: s.odometer })
  for (const e of expenses) if (e.odometer && e.date) out.push({ date: e.date, km: e.odometer })
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km)
}

/** The highest reading, with its date. */
export function currentOdometer(list: Reading[]): Reading | null {
  return list.reduce<Reading | null>((best, r) => (!best || r.km > best.km ? r : best), null)
}

/** Average km per day over the history (needs two weeks of span to mean anything). */
export function kmPerDay(list: Reading[]): number | null {
  if (list.length < 2) return null
  const first = list[0]
  const last = currentOdometer(list)!
  const days = (toTime(last.date) - toTime(first.date)) / DAY
  if (days < 14 || last.km <= first.km) return null
  return (last.km - first.km) / days
}

export interface KmService {
  /** km of the service the interval counts from */
  lastServiceKm: number
  dueKm: number
  /** km left (negative: overdue) — measured from the estimated odometer today */
  remainingKm: number
  /** estimated date the car reaches dueKm (today when overdue or unknown pace) */
  dueDate: string
  /** true when the date is only a guess with no pace to go by */
  roughDate: boolean
}

/**
 * When the next km-based service is due: last serviced km + interval,
 * projected to a date by the car's own pace. Without a pace yet, it only
 * reports once the car is within 1,500 km (dated today).
 */
export function kmServiceDue(car: Car, services: ServiceRecord[], expenses: ExpenseRecord[] = []): KmService | null {
  const interval = car.serviceIntervalKm
  if (!interval) return null
  const serviced = services.filter((s) => s.odometer).sort((a, b) => b.odometer! - a.odometer!)[0]
  if (!serviced?.odometer) return null
  const list = readings(car, services, expenses)
  const current = currentOdometer(list)
  if (!current) return null
  const pace = kmPerDay(list)
  const today = todayISO()
  // project the reading to today with the known pace
  const kmToday = pace ? current.km + pace * Math.max(0, (toTime(today) - toTime(current.date)) / DAY) : current.km
  const dueKm = serviced.odometer + interval
  const remainingKm = Math.round(dueKm - kmToday)
  if (!pace) {
    if (remainingKm > 1500) return null
    return { lastServiceKm: serviced.odometer, dueKm, remainingKm, dueDate: today, roughDate: true }
  }
  const days = Math.max(0, Math.ceil(remainingKm / pace))
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() + days)
  const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { lastServiceKm: serviced.odometer, dueKm, remainingKm, dueDate, roughDate: false }
}
