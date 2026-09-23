/** Formatting helpers, same behaviour as the web app's src/lib/utils.ts. */

/** days from today until an ISO date (negative = past) */
export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

/** 12-345-67 / 123-45-678 style Israeli plate formatting */
export function formatPlate(plate: string): string {
  const digits = plate.replace(/\D/g, '')
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  return plate
}

export type DueTone = 'neutral' | 'ok' | 'warn' | 'danger'

export function dueTone(iso?: string): DueTone {
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

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}
