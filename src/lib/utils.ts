/** Small shared helpers. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function newId(): string {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  )
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** days from today until an ISO date (negative = past). */
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
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function formatMoney(n?: number): string {
  if (n === undefined || n === null || isNaN(n)) return '—'
  return n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

export function formatNumber(n?: number): string {
  if (n === undefined || n === null || isNaN(n)) return '—'
  return n.toLocaleString('he-IL')
}

/** 12-345-67 / 123-45-678 style Israeli plate formatting. */
export function formatPlate(plate: string): string {
  const digits = plate.replace(/\D/g, '')
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  return plate
}

/** Status of a due date: ok (>30d), warn (<=30d), danger (<=7d or past). */
export function dueStatus(iso?: string): 'none' | 'ok' | 'warn' | 'danger' {
  if (!iso) return 'none'
  const d = daysUntil(iso)
  if (d < 0 || d <= 7) return 'danger'
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
