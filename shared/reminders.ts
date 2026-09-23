import type { Car, CustomReminder, DerivedReminder, InsuranceRecord, ServiceRecord } from './types'
import { daysUntil } from './utils'

export function carDisplayName(car: Pick<Car, 'nickname' | 'make' | 'model' | 'plate'>): string {
  return car.nickname || `${car.make} ${car.model}`.trim() || car.plate
}

export interface CarRecords {
  insurances: InsuranceRecord[]
  services: ServiceRecord[]
  reminders: CustomReminder[]
}

/** Every upcoming or overdue date of one car: test, date blocks with a
 *  reminder, the latest end date per insurance kind, next service due, and
 *  open custom reminders. Pure — the caller supplies the records. */
export function deriveReminders(car: Car, records: CarRecords): DerivedReminder[] {
  const out: DerivedReminder[] = []
  const name = carDisplayName(car)
  const push = (r: Omit<DerivedReminder, 'daysLeft' | 'carId' | 'carName' | 'carImage'>) =>
    out.push({ ...r, carId: car.id, carName: name, carImage: car.imageUrl, daysLeft: daysUntil(r.dueDate) })

  if (car.testExpiry) push({ key: `test:${car.id}`, title: 'חידוש טסט (רישוי שנתי)', dueDate: car.testExpiry, source: 'test' })
  if (car.licenseExpiry)
    push({ key: `license:${car.id}`, title: 'חידוש רישיון רכב', dueDate: car.licenseExpiry, source: 'license' })

  for (const block of car.blocks ?? []) {
    if (block.type === 'date' && block.remind && block.value)
      push({ key: `block:${car.id}:${block.id}`, title: block.title, dueDate: block.value, source: 'block' })
  }

  // only the latest end-date per insurance kind matters
  const latestByKind = new Map<string, string>()
  for (const ins of records.insurances) {
    if (!ins.endDate) continue
    const prev = latestByKind.get(ins.kind)
    if (!prev || ins.endDate > prev) latestByKind.set(ins.kind, ins.endDate)
  }
  for (const [kind, endDate] of latestByKind)
    push({ key: `ins:${car.id}:${kind}`, title: `סיום ביטוח ${kind}`, dueDate: endDate, source: 'insurance' })

  for (const s of records.services) {
    if (s.nextDueDate)
      push({ key: `svc:${car.id}:${s.id}`, title: `טיפול קרוב: ${s.title}`, dueDate: s.nextDueDate, source: 'service' })
  }

  for (const r of records.reminders) {
    if (!r.done)
      push({ key: `custom:${car.id}:${r.id}`, title: r.title, dueDate: r.dueDate, time: r.time, source: 'custom', customId: r.id })
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}
