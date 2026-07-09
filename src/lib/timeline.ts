import { repo } from '../data'
import type { Car } from '../types'
import { formatDate } from './utils'

export type EventKind = 'service' | 'insurance' | 'document' | 'created'

export interface TimelineEvent {
  id: string
  date: string // ISO yyyy-mm-dd
  kind: EventKind
  title: string
  subtitle?: string
  amount?: number
}

function ms(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime() || 0
}

/** Build a reverse-chronological history of everything that happened to a car
 *  — services, insurance policies, documents, and the day it was added. */
export async function collectCarEvents(car: Car): Promise<TimelineEvent[]> {
  const [services, insurances, documents] = await Promise.all([
    repo.listServices(car.id),
    repo.listInsurances(car.id),
    repo.listDocuments(car.id),
  ])

  const events: TimelineEvent[] = []

  for (const s of services) {
    events.push({
      id: `svc-${s.id}`,
      date: s.date,
      kind: 'service',
      title: s.title,
      subtitle: s.garage || undefined,
      amount: s.cost,
    })
  }

  for (const ins of insurances) {
    events.push({
      id: `ins-${ins.id}`,
      date: ins.startDate || ins.endDate,
      kind: 'insurance',
      title: `ביטוח ${ins.kind} · ${ins.company}`,
      subtitle: ins.endDate ? `בתוקף עד ${formatDate(ins.endDate)}` : undefined,
      amount: ins.cost,
    })
  }

  for (const d of documents) {
    events.push({
      id: `doc-${d.id}`,
      date: new Date(d.createdAt).toISOString().slice(0, 10),
      kind: 'document',
      title: d.title,
      subtitle: d.category,
    })
  }

  events.push({
    id: 'created',
    date: new Date(car.createdAt).toISOString().slice(0, 10),
    kind: 'created',
    title: 'הרכב נוסף ל-Car360',
  })

  return events.sort((a, b) => ms(b.date) - ms(a.date))
}
