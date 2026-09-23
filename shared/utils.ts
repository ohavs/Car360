/** Formatting and date helpers shared by the web app and the Android app.
 *  Pure TypeScript: no DOM, no React, no platform APIs. */

export function newId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** days from today until an ISO date (negative = past) */
export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

/** 12.3.2027 */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

function group(n: number): string {
  const [int, dec] = String(Math.round(Math.abs(n) * 100) / 100).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + (dec ? `${grouped}.${dec}` : grouped)
}

/** ₪4,200 */
export function formatMoney(n?: number): string {
  if (n === undefined || n === null || isNaN(n)) return '—'
  return `₪${group(Math.round(n))}`
}

export function formatNumber(n?: number): string {
  if (n === undefined || n === null || isNaN(n)) return '—'
  return group(n)
}

/** 12-345-67 / 123-45-678 style Israeli plate formatting */
export function formatPlate(plate: string): string {
  const digits = plate.replace(/\D/g, '')
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  return plate
}

export type DueStatus = 'neutral' | 'ok' | 'warn' | 'danger'

/** ok (>30d), warn (<=30d), danger (<=7d or past) */
export function dueStatus(iso?: string): DueStatus {
  if (!iso) return 'neutral'
  const d = daysUntil(iso)
  if (d <= 7) return 'danger'
  if (d <= 30) return 'warn'
  return 'ok'
}

export function dueLabel(iso?: string): string {
  if (!iso) return ''
  const d = daysUntil(iso)
  if (d < 0) return `פג לפני ${Math.abs(d)} ימים`
  if (d === 0) return 'היום!'
  if (d === 1) return 'מחר'
  return `בעוד ${d} ימים`
}
