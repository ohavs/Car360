import type { Car, DerivedReminder } from '../types'
import { daysUntil } from './utils'

/** A single contributor to the car's overall "health" score. */
export interface HealthFactor {
  key: string
  label: string
  status: 'good' | 'warn' | 'bad' | 'missing'
  score: number // 0..100
  date?: string
  daysLeft?: number
}

function fromDate(iso?: string): Pick<HealthFactor, 'status' | 'score' | 'date' | 'daysLeft'> {
  if (!iso) return { status: 'missing', score: 0 }
  const d = daysUntil(iso)
  const base = { date: iso, daysLeft: d }
  if (d < 0) return { status: 'bad', score: 20, ...base }
  if (d <= 30) return { status: 'warn', score: 60, ...base }
  return { status: 'good', score: 100, ...base }
}

/** Overall car-care score (0-100) from its key dates + insurance state.
 *  Deliberately simple & transparent so the ring is easy to reason about. */
export function carHealth(car: Car, reminders: DerivedReminder[]): {
  score: number
  factors: HealthFactor[]
} {
  const insurance = reminders.find((r) => r.source === 'insurance')

  const factors: HealthFactor[] = [
    { key: 'test', label: 'טסט', ...fromDate(car.testExpiry) },
    { key: 'insurance', label: 'ביטוח', ...fromDate(insurance?.dueDate) },
    { key: 'license', label: 'רישיון', ...fromDate(car.licenseExpiry) },
  ]

  const score = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length)
  return { score, factors }
}

export function healthTone(score: number): 'ok' | 'warn' | 'danger' {
  if (score >= 75) return 'ok'
  if (score >= 45) return 'warn'
  return 'danger'
}

export function healthLabel(score: number): string {
  if (score >= 90) return 'מצוין'
  if (score >= 75) return 'תקין'
  if (score >= 45) return 'דורש תשומת לב'
  return 'טעון טיפול'
}
