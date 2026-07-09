import { motion } from 'motion/react'
import { useMemo } from 'react'
import { formatMoney } from '../lib/utils'

interface Datum {
  date?: string
  cost?: number
}

function shortMoney(n: number): string {
  if (n >= 1000) return `₪${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `₪${n}`
}

/** Compact single-series yearly-spend bar chart. Pure inline SVG + tokens,
 *  so it adapts to every palette/skin and light/dark automatically. */
export default function ExpenseChart({
  items,
  title = 'הוצאות לפי שנה',
}: {
  items: Datum[]
  title?: string
}) {
  const { bars, total, max } = useMemo(() => {
    const byYear = new Map<string, number>()
    for (const it of items) {
      if (it.cost == null || !it.date) continue
      const y = it.date.slice(0, 4)
      byYear.set(y, (byYear.get(y) ?? 0) + it.cost)
    }
    const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
    const max = Math.max(1, ...years.map(([, v]) => v))
    const total = [...byYear.values()].reduce((s, v) => s + v, 0)
    return { bars: years, total, max }
  }, [items])

  if (bars.length < 1 || total === 0) return null

  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-black">{title}</h3>
        <span className="text-sm font-bold text-ink-2">סה״כ {formatMoney(total)}</span>
      </div>
      <div className="flex h-36 items-end justify-between gap-2">
        {bars.map(([year, value], i) => (
          <div key={year} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-bold text-ink-2">{shortMoney(value)}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.05 * i }}
              className="w-full rounded-t-xl bg-cta"
              style={{ minHeight: 6 }}
            />
            <span className="text-[11px] font-semibold text-ink-3">{year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
