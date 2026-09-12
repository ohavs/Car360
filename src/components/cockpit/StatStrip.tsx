import { Link } from 'react-router-dom'
import GlassPanel from './GlassPanel'
import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

export type StatTone = 'neutral' | 'ok' | 'warn' | 'danger'

export interface Stat {
  label: string
  icon: ReactNode
  value: string
  /** small line under the value — the status or the context for the number */
  meta?: string
  tone?: StatTone
  to?: string
}

const TONE_TEXT: Record<StatTone, string> = {
  neutral: 'text-ink-3',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
}

const TONE_DOT: Record<StatTone, string> = {
  neutral: 'bg-transparent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
}

/** The key figures as one quiet strip rather than a stack of big tiles: the
 *  numbers still lead, but they cost a fraction of the height and read as a
 *  single object. Status is carried by a dot and the meta line's colour, so an
 *  overdue date is obvious without a badge competing for attention. */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <GlassPanel className="!p-0 overflow-hidden">
      <div className="flex items-stretch divide-x divide-line [&>*]:flex-1">
        {stats.map((s) => {
          const tone = s.tone ?? 'neutral'
          const body = (
            <span className="flex min-w-0 flex-col gap-0.5 px-4 py-3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-3">
                <span className="shrink-0 text-ink-3">{s.icon}</span>
                <span className="truncate">{s.label}</span>
                {tone !== 'neutral' && (
                  <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
                )}
              </span>
              <span className="truncate text-xl font-black leading-tight tabular-nums">{s.value}</span>
              {s.meta && (
                <span className={cn('truncate text-[11px] font-bold', TONE_TEXT[tone])}>{s.meta}</span>
              )}
            </span>
          )
          return s.to ? (
            <Link key={s.label} to={s.to} className="block active:opacity-70">
              {body}
            </Link>
          ) : (
            <div key={s.label}>{body}</div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
